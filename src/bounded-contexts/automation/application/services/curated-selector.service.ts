import { CuratedSelectorAllScoringFailedException } from '@/bounded-contexts/automation/domain/exceptions/automation.exceptions';
import { LoggerPort } from '@/shared-kernel';
import { CuratedSelectorRepositoryPort } from '../../domain/ports/curated-selector.repository.port';
import { ResumeJobMatcherPort } from '../../domain/ports/resume-job-matcher.port';

/**
 * Picks the top N jobs that match a user's primary resume, subject to any
 * `UserApplyCriteria` filters they set.
 *
 * Shared by both workers: Weekly-Curated uses it once a week per user;
 * Auto-Apply hits it hourly with a tighter `since` window and min-fit floor.
 *
 * POJO orchestrator — wired via the module's `useFactory`. Takes
 * `CuratedSelectorRepositoryPort` instead of `PrismaService` directly
 * (P2-#24 clean-arch fix) and a `LoggerPort` so the testing harness can
 * swap in `stubLogger` without bringing in Nest.
 */

const CTX = 'CuratedSelectorService';

const CANDIDATE_POOL_LIMIT = 80;

export class CuratedSelectorService {
  constructor(
    private readonly repository: CuratedSelectorRepositoryPort,
    private readonly matcher: ResumeJobMatcherPort,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Score and rank jobs created after `since` against the user's primary
   * resume. Returns the top `limit` whose `matchScore >= minFit`.
   */
  async selectForUser(params: {
    userId: string;
    since: Date;
    minFit?: number;
    limit?: number;
  }): Promise<Array<{ jobId: string; matchScore: number }>> {
    const { userId, since } = params;
    const minFit = params.minFit ?? 80;
    const limit = params.limit ?? 5;

    const user = await this.repository.findUserView(userId);
    if (!user?.primaryResumeId) return [];

    const criteria = user.applyCriteria ?? null;

    // Narrow the candidate pool with the user's structured criteria before we
    // reach for the (expensive) scoring pass. The repo always excludes the
    // user's own jobs and jobs the user has already applied to.
    const jobs = await this.repository.listCandidateJobs({
      userId,
      since,
      remotePolicies: criteria?.remotePolicies?.length ? criteria.remotePolicies : undefined,
      paymentCurrencies: criteria?.paymentCurrencies?.length
        ? criteria.paymentCurrencies
        : undefined,
      stacks: criteria?.stacks?.length ? criteria.stacks : undefined,
      limit: CANDIDATE_POOL_LIMIT,
    });

    const scored: Array<{ jobId: string; matchScore: number }> = [];
    let scoringFailures = 0;
    for (const job of jobs) {
      const jobText = [
        job.title,
        (job.requirements ?? []).join('\n'),
        (job.skills ?? []).join(', '),
        job.description,
      ]
        .filter(Boolean)
        .join('\n\n');

      try {
        const match = await this.matcher.matchJobDescription(user.primaryResumeId, userId, jobText);
        if (match.matchScore >= minFit) {
          scored.push({ jobId: job.id, matchScore: match.matchScore });
        }
      } catch (err) {
        scoringFailures++;
        this.logger.warn(
          `Scoring failed for user=${userId} job=${job.id}: ${(err as Error).message}`,
          CTX,
        );
      }
    }

    if (scoringFailures > 0 && scoringFailures === jobs.length) {
      throw new CuratedSelectorAllScoringFailedException(userId, jobs.length);
    }
    if (scoringFailures > jobs.length / 2) {
      this.logger.error(
        `Curated selector: ${scoringFailures}/${jobs.length} scoring calls failed for user=${userId} — investigate`,
        { context: CTX },
      );
    }

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }
}
