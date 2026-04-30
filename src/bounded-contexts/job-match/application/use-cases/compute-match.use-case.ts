import { SimilarityPort } from '@/bounded-contexts/fit-profile/domain/ports/similarity.port';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { MatchComputedEvent } from '../../domain/events';
import {
  JobMatchFitProfileRequiredException,
  JobMatchJobNotFoundException,
  JobMatchResumeNotFoundException,
} from '../../domain/exceptions/job-match.exceptions';
import { JobLoaderPort } from '../../domain/ports/job-loader.port';
import { MatchCachePort } from '../../domain/ports/match-cache.port';
import { RequirementsMatcherPort } from '../../domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from '../../domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import { SemanticMatcherPort } from '../../domain/ports/semantic-matcher.port';
import { UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import { blendMatch } from '../../domain/rules/blend-match.rules';
import { scoreKeywordMatch } from '../../domain/rules/keyword-match.rules';
import { MATCH_RULES_VERSION, type MatchBreakdown, type SubScoreResult } from '../../domain/types';

export interface ComputeMatchInput {
  readonly userId: string;
  readonly resumeId: string;
  readonly jobId: string;
}

/**
 * Orchestrator for the Match Score. Enforces the hard invariants up
 * front (resume exists, job exists, user has a valid fit profile), then
 * fans out to the four sub-score providers in parallel. Each provider
 * is behind its own port so AI failures degrade gracefully: the blender
 * drops any `null` sub-score and renormalises the remaining weights so
 * the final number is still a proper 0–100.
 *
 * Not persistent by design — per the plan, Match Snapshots are only
 * captured when the user actually applies, and that capture lives on
 * the `Application` row (owned by another context). Here we return the
 * breakdown inline and optionally hit the cache so repeated views of
 * the same job in the same day don't spin up four AI calls.
 */
export class ComputeMatchUseCase {
  constructor(
    private readonly resumeExistence: ResumeExistencePort,
    private readonly jobLoader: JobLoaderPort,
    private readonly fitState: UserFitStatePort,
    private readonly keywordSource: ResumeKeywordSourcePort,
    private readonly requirementsMatcher: RequirementsMatcherPort,
    private readonly semanticMatcher: SemanticMatcherPort,
    private readonly similarity: SimilarityPort,
    private readonly cache: MatchCachePort,
    private readonly events: EventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: ComputeMatchInput): Promise<MatchBreakdown> {
    const startedAt = Date.now();
    const { userId, resumeId, jobId } = input;

    // ── Hard invariants ─────────────────────────────────────────────
    const [exists, job, fit] = await Promise.all([
      this.resumeExistence.exists(resumeId),
      this.jobLoader.load(jobId),
      this.fitState.getStatus(userId),
    ]);
    if (!exists) throw new JobMatchResumeNotFoundException(resumeId);
    if (!job) throw new JobMatchJobNotFoundException(jobId);
    if (fit.status !== 'responded') {
      throw new JobMatchFitProfileRequiredException(fit.status === 'expired' ? 'expired' : 'never');
    }

    // ── Cache lookup ────────────────────────────────────────────────
    // Version-rich key so mutations anywhere in the graph bust the
    // cache naturally — `rulesVersion` is part of the key so a blend
    // tweak invalidates without ops needing to FLUSHDB.
    const cacheKey = `match:${resumeId}:${jobId}:${userId}:${MATCH_RULES_VERSION}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.publishComputed({
        userId,
        resumeId,
        jobId,
        breakdown: cached,
        fromCache: true,
        startedAt,
      });
      return cached;
    }

    // ── Fan out to the four providers concurrently ──────────────────
    const [keywords, requirements, semantic, fitSub] = await Promise.all([
      this.runKeyword(resumeId, job.keywords),
      this.runRequirements(resumeId, jobId, job),
      this.runSemantic(resumeId, jobId),
      this.runFit(userId, jobId, job),
    ]);

    const subScores = { keyword: keywords, requirements, semantic, fit: fitSub } satisfies Record<
      string,
      SubScoreResult
    >;

    const { overallScore, effectiveWeights } = blendMatch(subScores);
    const breakdown: MatchBreakdown = {
      overallScore,
      subScores,
      effectiveWeights,
      rulesVersion: MATCH_RULES_VERSION,
      computedAt: new Date(),
    };

    // Cache best-effort — a cache failure must not fail the read.
    try {
      await this.cache.set(cacheKey, breakdown);
    } catch (err) {
      this.logger.warn(`Match cache set failed: ${(err as Error).message}`, 'ComputeMatchUseCase');
    }

    this.publishComputed({ userId, resumeId, jobId, breakdown, fromCache: false, startedAt });

    return breakdown;
  }

  private publishComputed(args: {
    userId: string;
    resumeId: string;
    jobId: string;
    breakdown: MatchBreakdown;
    fromCache: boolean;
    startedAt: number;
  }): void {
    const subScores: Record<string, number | null> = {
      keyword: args.breakdown.subScores.keyword.score,
      requirements: args.breakdown.subScores.requirements.score,
      semantic: args.breakdown.subScores.semantic.score,
      fit: args.breakdown.subScores.fit.score,
    };
    this.events.publish(
      new MatchComputedEvent(args.jobId, {
        userId: args.userId,
        resumeId: args.resumeId,
        jobId: args.jobId,
        overallScore: args.breakdown.overallScore,
        subScores: subScores as MatchComputedEvent['payload']['subScores'],
        effectiveWeights: args.breakdown.effectiveWeights,
        rulesVersion: args.breakdown.rulesVersion,
        fromCache: args.fromCache,
        durationMs: Date.now() - args.startedAt,
      }),
    );
  }

  // ── Sub-score runners — each catches its own errors and returns a
  // `null` score so the blend logic decides whether to degrade. ─────
  private async runKeyword(resumeId: string, required: readonly string[]): Promise<SubScoreResult> {
    try {
      const candidate = await this.keywordSource.getKeywords(resumeId);
      return scoreKeywordMatch({ required, candidate });
    } catch (err) {
      this.logger.warn(
        `Keyword sub-score failed: ${(err as Error).message}`,
        'ComputeMatchUseCase',
      );
      return { score: null };
    }
  }

  private async runRequirements(
    resumeId: string,
    jobId: string,
    job: Awaited<ReturnType<JobLoaderPort['load']>>,
  ): Promise<SubScoreResult> {
    try {
      return await this.requirementsMatcher.match({
        resumeId,
        jobId,
        structuredRequirements: job?.structuredRequirements ?? {},
        enrichedByAi: job?.enrichedByAi,
      });
    } catch (err) {
      this.logger.warn(
        `Requirements sub-score failed: ${(err as Error).message}`,
        'ComputeMatchUseCase',
      );
      return { score: null };
    }
  }

  private async runSemantic(resumeId: string, jobId: string): Promise<SubScoreResult> {
    try {
      return await this.semanticMatcher.match({ resumeId, jobId });
    } catch (err) {
      this.logger.warn(
        `Semantic sub-score failed: ${(err as Error).message}`,
        'ComputeMatchUseCase',
      );
      return { score: null };
    }
  }

  private async runFit(
    userId: string,
    jobId: string,
    job: Awaited<ReturnType<JobLoaderPort['load']>>,
  ): Promise<SubScoreResult> {
    try {
      const role = await this.similarity.role(userId, jobId);
      // Company-side culture signal is optional. Only consult it when
      // the recruiter captured a profile; otherwise role-only is the
      // honest answer and the blend treats it as any other sub-score.
      if (job?.culturalProfileCaptured && job?.companyId) {
        const culture = await this.similarity.culture(userId, job.companyId);
        if (role.score !== null && culture.score !== null) {
          // α = 0.4 culture, β = 0.6 role — culture is a shared
          // company-level signal, role is per-vacancy and thus more
          // specific to this application.
          return {
            score: Math.round(culture.score * 0.4 + role.score * 0.6),
            detail: { culture: culture.score, role: role.score },
          };
        }
      }
      return {
        score: role.score,
        detail: role.score === null ? undefined : { role: role.score },
      };
    } catch (err) {
      this.logger.warn(`Fit sub-score failed: ${(err as Error).message}`, 'ComputeMatchUseCase');
      return { score: null };
    }
  }
}
