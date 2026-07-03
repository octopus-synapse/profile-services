import type { LoggerPort } from '@/shared-kernel/logger';
import { scoreToRank } from '@/shared-kernel/scoring';
import type { ReadinessHistoryPort } from '../../domain/ports/readiness-history.port';
import type {
  FitLifecycleRead,
  LatestQualityRead,
  ScoresReadPort,
  ScoreTrendRead,
} from '../../domain/ports/scores-read.port';
import type { ReadinessBreakdown } from '../../domain/readiness/readiness.types';
import type { ComputeReadinessUseCase } from './compute-readiness.use-case';

/** How many trend points to surface for the momentum charts. */
const TREND_LIMIT = 12;

export interface MeScoresView {
  readonly resumeId: string | null;
  readonly rank: ReturnType<typeof scoreToRank>;
  readonly readiness: {
    readonly breakdown: ReadinessBreakdown;
    readonly trend: readonly ScoreTrendRead[];
  };
  readonly quality: {
    readonly latest: LatestQualityRead;
    readonly trend: readonly ScoreTrendRead[];
  } | null;
  readonly style: { readonly score: number } | null;
  readonly fit: FitLifecycleRead;
}

/**
 * Composes the master resume's job-independent scores (Readiness,
 * Quality, Style, Fit) into one view for the Desempenho hub. Readiness
 * is computed on-demand (persist:false) so the number is always fresh
 * even between background recomputes; its trend comes from the history
 * table. Cold-start safe: when the user has no primary resume, only
 * Readiness (computable from fit alone) and Fit are returned.
 */
export class GetMeScoresUseCase {
  constructor(
    private readonly reads: ScoresReadPort,
    private readonly computeReadiness: ComputeReadinessUseCase,
    private readonly readinessHistory: ReadinessHistoryPort,
    private readonly logger: LoggerPort,
  ) {
    void this.logger;
  }

  /** Scores for the caller's master (primary) resume. Cold-start safe. */
  async execute(userId: string): Promise<MeScoresView> {
    const resumeId = await this.reads.getPrimaryResumeId(userId);
    return this.buildView(userId, resumeId);
  }

  /** Scores for a specific resume the caller owns (ownership enforced at the
   * route). Readiness is computed on-demand for that resume too, so derived
   * resumes get the same uniform shape as the master. */
  async executeForResume(userId: string, resumeId: string): Promise<MeScoresView> {
    return this.buildView(userId, resumeId);
  }

  private async buildView(userId: string, resumeId: string | null): Promise<MeScoresView> {
    const fit = await this.reads.getFitLifecycle(userId);

    // Readiness is always computable — with no resume it still reflects
    // fit freshness — so the hero always has a headline number.
    const readinessResumeId = resumeId ?? '';
    const [{ breakdown }, readinessTrend, quality, styleScore, qualityTrend] = await Promise.all([
      this.computeReadiness.execute({ userId, resumeId: readinessResumeId, persist: false }),
      resumeId
        ? this.readinessHistory.findTrend(resumeId, TREND_LIMIT)
        : Promise.resolve<readonly ScoreTrendRead[]>([]),
      resumeId ? this.reads.getLatestQuality(resumeId) : Promise.resolve(null),
      resumeId ? this.reads.getStyleScoreForResume(resumeId) : Promise.resolve(null),
      resumeId
        ? this.reads.getQualityTrend(resumeId, TREND_LIMIT)
        : Promise.resolve<readonly ScoreTrendRead[]>([]),
    ]);

    return {
      resumeId,
      rank: scoreToRank(breakdown.overallScore),
      readiness: { breakdown, trend: readinessTrend },
      quality: quality ? { latest: quality, trend: qualityTrend } : null,
      style: styleScore === null ? null : { score: styleScore },
      fit,
    };
  }
}
