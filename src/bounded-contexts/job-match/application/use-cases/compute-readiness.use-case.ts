import type { LoggerPort } from '@/shared-kernel';
import type {
  ReadinessHistoryPort,
  SavedReadinessScore,
} from '../../domain/ports/readiness-history.port';
import type { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import type { ResumeQualitySourcePort } from '../../domain/ports/resume-quality-source.port';
import type { TargetRoleCoveragePort } from '../../domain/ports/target-role-coverage.port';
import type { UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import {
  blendReadiness,
  scoreCoverage,
  scoreFitFreshness,
} from '../../domain/readiness/blend-readiness.rules';
import {
  READINESS_RULES_VERSION,
  type ReadinessBreakdown,
} from '../../domain/readiness/readiness.types';

export interface ComputeReadinessInput {
  readonly userId: string;
  readonly resumeId: string;
  /** When true, the fresh computation is appended to the history table.
   * Read-only callers (the scores endpoint) pass `false` to avoid
   * writing a row on every page view. */
  readonly persist?: boolean;
}

export interface ComputeReadinessResult {
  readonly breakdown: ReadinessBreakdown;
  /** The persisted row when `persist` was requested, else `null`. */
  readonly saved: SavedReadinessScore | null;
}

/**
 * Computes the job-independent Readiness Score for a resume by blending
 * three signals the platform already produces (Quality, skill coverage,
 * fit freshness). Deterministic and cheap — no AI calls. Each signal is
 * read behind its own port so a failure degrades to `null` and the
 * blender reallocates its weight rather than throwing.
 */
export class ComputeReadinessUseCase {
  constructor(
    private readonly qualitySource: ResumeQualitySourcePort,
    private readonly keywordSource: ResumeKeywordSourcePort,
    private readonly targetRoleCoverage: TargetRoleCoveragePort,
    private readonly fitState: UserFitStatePort,
    private readonly history: ReadinessHistoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: ComputeReadinessInput): Promise<ComputeReadinessResult> {
    const { userId, resumeId } = input;

    const [quality, coverage, fit] = await Promise.all([
      this.readQuality(resumeId),
      this.readCoverage(userId, resumeId),
      this.readFit(userId),
    ]);

    const factors = { quality, coverage, fit } as const;
    const { overallScore, effectiveWeights } = blendReadiness({ ...factors });

    const breakdown: ReadinessBreakdown = {
      overallScore,
      factors,
      effectiveWeights,
      rulesVersion: READINESS_RULES_VERSION,
      computedAt: new Date(),
    };

    let saved: SavedReadinessScore | null = null;
    if (input.persist) {
      try {
        saved = await this.history.save({ resumeId, breakdown });
      } catch (err) {
        // Persistence is best-effort — a failed history write must not
        // fail the computation (mirrors the quality-on-create policy).
        this.logger.warn(
          `Readiness history save failed for resume=${resumeId}: ${(err as Error).message}`,
          'ComputeReadinessUseCase',
        );
      }
    }

    return { breakdown, saved };
  }

  private async readQuality(resumeId: string): Promise<{ score: number | null }> {
    try {
      return { score: await this.qualitySource.getLatestOverallScore(resumeId) };
    } catch (err) {
      this.logger.warn(
        `Readiness quality read failed: ${(err as Error).message}`,
        'ComputeReadinessUseCase',
      );
      return { score: null };
    }
  }

  private async readCoverage(userId: string, resumeId: string): Promise<{ score: number | null }> {
    // Prefer market-relative coverage (résumé skills vs the target role's
    // in-demand skills); fall back to the deterministic skill-count when there
    // is no target role or its skills can't be resolved.
    try {
      const market = await this.targetRoleCoverage.computeCoverage(userId, resumeId);
      if (market !== null) return { score: market };
    } catch (err) {
      this.logger.warn(
        `Readiness market coverage failed: ${(err as Error).message}`,
        'ComputeReadinessUseCase',
      );
    }
    try {
      const keywords = await this.keywordSource.getKeywords(resumeId);
      const distinct = new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)).size;
      return { score: scoreCoverage(distinct) };
    } catch (err) {
      this.logger.warn(
        `Readiness coverage read failed: ${(err as Error).message}`,
        'ComputeReadinessUseCase',
      );
      return { score: null };
    }
  }

  private async readFit(userId: string): Promise<{ score: number | null }> {
    try {
      const { status } = await this.fitState.getStatus(userId);
      return { score: scoreFitFreshness(status) };
    } catch (err) {
      this.logger.warn(
        `Readiness fit read failed: ${(err as Error).message}`,
        'ComputeReadinessUseCase',
      );
      return { score: null };
    }
  }
}
