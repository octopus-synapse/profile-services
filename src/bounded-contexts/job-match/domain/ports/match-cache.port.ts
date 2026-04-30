import type { MatchBreakdown } from '../types';

/**
 * Port for caching Match Score results. The real implementation is
 * multi-level Redis (see docs/scoring/README.md): level 1 caches the
 * final breakdown keyed by `(resumeVersion, jobVersion, userFitVersion,
 * jobFitVersion, rulesVersion)`; level 2 caches the sub-computations
 * (embeddings, normalised requirements) so a single source of invalidation
 * flows through the whole graph.
 *
 * This MVP uses a noop adapter so the orchestrator wiring is exercised
 * end-to-end; the Redis adapter lands with the BullMQ infra in Task #20.
 */
export abstract class MatchCachePort {
  abstract get(cacheKey: string): Promise<MatchBreakdown | null>;
  abstract set(cacheKey: string, breakdown: MatchBreakdown): Promise<void>;
}
