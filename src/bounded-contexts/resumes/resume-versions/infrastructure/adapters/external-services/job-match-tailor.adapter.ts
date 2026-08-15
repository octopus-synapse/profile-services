/**
 * `TailorMatchPort` implementation delegating to the job-match BC's
 * ComputeMatchUseCase (typed structurally to keep the coupling thin).
 *
 * The engine is provided as a thunk because the job-match composition is
 * built later in the bootstrap than resume-versions; tailor calls happen
 * at request time, long after both exist. Any failure (engine absent,
 * fit gate, listing swept, cache trouble) degrades to `null` — the
 * compatibility estimate is garnish on the tailor response, never a
 * blocker.
 */

import { LoggerPort } from '@/shared-kernel';
import type { TailorMatchBreakdown } from '../../../domain/ports/tailor-match.port';
import { TailorMatchPort } from '../../../domain/ports/tailor-match.port';

export type TailorComputeMatchLike = {
  execute(input: { userId: string; resumeId: string; jobId: string }): Promise<{
    overallScore: number;
    subScores: {
      keyword: { score: number | null; detail?: { matched: string[]; missing: string[] } };
    };
    effectiveWeights: { keyword: number };
  }>;
};

export class JobMatchTailorAdapter extends TailorMatchPort {
  constructor(
    private readonly getEngine: () => TailorComputeMatchLike | null,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async computeForJob(
    userId: string,
    resumeId: string,
    jobId: string,
  ): Promise<TailorMatchBreakdown | null> {
    const engine = this.getEngine();
    if (!engine) return null;
    try {
      const breakdown = await engine.execute({ userId, resumeId, jobId });
      return {
        overallScore: breakdown.overallScore,
        keywordScore: breakdown.subScores.keyword.score,
        keywordWeight: breakdown.effectiveWeights.keyword,
        matched: breakdown.subScores.keyword.detail?.matched ?? [],
        missing: breakdown.subScores.keyword.detail?.missing ?? [],
      };
    } catch (err) {
      this.logger.warn(
        `Tailor match estimate unavailable for job ${jobId}: ${err instanceof Error ? err.message : 'unknown'}`,
        'JobMatchTailorAdapter',
      );
      return null;
    }
  }
}
