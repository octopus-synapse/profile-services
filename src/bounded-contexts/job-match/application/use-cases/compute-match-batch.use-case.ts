/**
 * Batch Match Scores for a jobs-list page: computes (or serves from the
 * 24h Redis cache) the overall score of one resume against up to a page
 * of listings, with a small concurrency cap so a cold page doesn't fan
 * out twenty 4-provider computations at once. Sub-computations stay
 * cheap on repeats: job/resume embeddings are cached 7 days (the job
 * side shared across users) and the per-pair breakdown 24h.
 *
 * Per-item failures are skipped, not surfaced — a row without a score
 * simply renders without a chip. Without a responded fit profile the
 * whole batch short-circuits to an empty list (matching the single
 * compute's hard invariant, minus the 4xx noise).
 */

import { LoggerPort } from '@/shared-kernel';
import { type ScoreRank, scoreToRank } from '@/shared-kernel/scoring';
import { UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import type { ComputeMatchUseCase } from './compute-match.use-case';

export interface ComputeMatchBatchInput {
  readonly userId: string;
  readonly resumeId: string;
  readonly jobIds: readonly string[];
}

export type BatchMatchScore = {
  jobId: string;
  overallScore: number;
  rank: ScoreRank;
};

const CONCURRENCY = 4;

export class ComputeMatchBatchUseCase {
  constructor(
    private readonly computeMatch: ComputeMatchUseCase,
    private readonly fitState: UserFitStatePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: ComputeMatchBatchInput): Promise<{ scores: BatchMatchScore[] }> {
    const jobIds = [...new Set(input.jobIds)];
    if (jobIds.length === 0) return { scores: [] };

    const fit = await this.fitState.getStatus(input.userId);
    if (fit.status !== 'responded') return { scores: [] };

    const byId = new Map<string, BatchMatchScore>();
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, jobIds.length) }, async () => {
      while (cursor < jobIds.length) {
        const jobId = jobIds[cursor++];
        if (!jobId) break;
        try {
          const breakdown = await this.computeMatch.execute({
            userId: input.userId,
            resumeId: input.resumeId,
            jobId,
          });
          byId.set(jobId, {
            jobId,
            overallScore: breakdown.overallScore,
            rank: scoreToRank(breakdown.overallScore),
          });
        } catch (err) {
          // Swept listing, provider hiccup, etc. — the row just goes chip-less.
          this.logger.debug?.(
            `Batch match skipped job ${jobId}: ${err instanceof Error ? err.message : 'unknown'}`,
            'ComputeMatchBatchUseCase',
          );
        }
      }
    });
    await Promise.all(workers);

    // Request order, minus the failures.
    const scores: BatchMatchScore[] = [];
    for (const id of jobIds) {
      const score = byId.get(id);
      if (score) scores.push(score);
    }
    return { scores };
  }
}
