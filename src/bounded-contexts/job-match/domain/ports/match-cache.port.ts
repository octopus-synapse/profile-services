import type { MatchBreakdown } from '../types';

/** Single-flight lock surface — `acquireLock` returns `null` when the
 * key is held by another request; the caller falls back to re-reading
 * the cache rather than racing the same expensive AI fan-out. */
export interface MatchCacheLock {
  release(): Promise<void>;
}

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
 *
 * P1-027: `acquireLock` was added so `ComputeMatchUseCase` can do
 * single-flight on cache miss (4 AI calls × N concurrent → 4 AI calls
 * total + N-1 follower reads).
 */
export abstract class MatchCachePort {
  abstract get(cacheKey: string): Promise<MatchBreakdown | null>;
  abstract set(cacheKey: string, breakdown: MatchBreakdown): Promise<void>;
  /** Returns `null` when another request already holds the lock. */
  abstract acquireLock(cacheKey: string, ttlSeconds: number): Promise<MatchCacheLock | null>;
}
