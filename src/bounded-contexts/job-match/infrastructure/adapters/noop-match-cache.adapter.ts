import { Injectable } from '@nestjs/common';
import { MatchCachePort } from '../../domain/ports/match-cache.port';
import type { MatchBreakdown } from '../../domain/types';

/**
 * No-op cache. Every `get` is a miss and `set` does nothing. The Redis
 * implementation arrives with the BullMQ + queue infra in Task #20; the
 * use-case wiring already handles cache failures gracefully, so
 * plugging in the real adapter later is a one-line change.
 */
@Injectable()
export class NoopMatchCacheAdapter extends MatchCachePort {
  async get(_cacheKey: string): Promise<MatchBreakdown | null> {
    return null;
  }
  async set(_cacheKey: string, _breakdown: MatchBreakdown): Promise<void> {}
}
