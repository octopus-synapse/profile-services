import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { LoggerPort } from '@/shared-kernel';
import { MatchCachePort } from '../../domain/ports/match-cache.port';
import type { MatchBreakdown } from '../../domain/types';

/** Wall-clock TTL for a cached Match Breakdown. 24 h lines up with the
 * plan: the hottest recomputes (resume saves, fit-profile expiry, job
 * edits) already invalidate specific keys via the recompute worker;
 * the TTL is the safety net against drift in signals we forgot to
 * wire. */
const MATCH_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Redis-backed Match cache. Falls back gracefully when Redis is
 * unavailable: misses on get, silent drops on set. The orchestrator
 * already treats `null` as "recompute" and logs (but ignores) set
 * failures — so a Redis outage makes matches slower, not broken.
 */
export class RedisMatchCacheAdapter extends MatchCachePort {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async get(cacheKey: string): Promise<MatchBreakdown | null> {
    try {
      const hit = await this.cache.get<SerialisedBreakdown>(this.prefix(cacheKey));
      return hit ? deserialise(hit) : null;
    } catch (err) {
      this.logger.warn(
        `Match cache get failed for ${cacheKey}: ${(err as Error).message}`,
        'RedisMatchCacheAdapter',
      );
      return null;
    }
  }

  async set(cacheKey: string, breakdown: MatchBreakdown): Promise<void> {
    try {
      await this.cache.set(this.prefix(cacheKey), serialise(breakdown), MATCH_CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(
        `Match cache set failed for ${cacheKey}: ${(err as Error).message}`,
        'RedisMatchCacheAdapter',
      );
    }
  }

  /** Namespace every key under `match:*` so recompute invalidations
   * can wipe the whole space with a single pattern delete. */
  private prefix(key: string): string {
    return `match:${key}`;
  }
}

/** JSON-safe representation. `Date` instances round-trip as ISO strings
 * — BigInt would also need handling but the Breakdown has none today. */
type SerialisedBreakdown = Omit<MatchBreakdown, 'computedAt'> & { computedAt: string };

function serialise(b: MatchBreakdown): SerialisedBreakdown {
  return { ...b, computedAt: b.computedAt.toISOString() };
}

function deserialise(s: SerialisedBreakdown): MatchBreakdown {
  return { ...s, computedAt: new Date(s.computedAt) };
}
