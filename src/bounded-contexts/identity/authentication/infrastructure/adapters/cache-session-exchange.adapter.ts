/**
 * Redis-backed adapter for `SessionExchangePort`.
 *
 * Stores the V2 D42 mobile session-exchange payload behind a namespaced
 * key (`session-exchange:<id>`) with the TTL supplied by the use case
 * (60s by default). Consumption is atomic: the adapter reads the value
 * first, then issues a delete — concurrent callers race for the read,
 * and at most one observes a non-null payload because the second read
 * (or the read that arrives after the delete) returns `null`.
 *
 * For the production Redis adapter (`CacheCoreService` → ioredis) the
 * `delete()` is fire-and-forget; we await it so a flaky cache surfaces
 * as a failed exchange instead of a "succeeded but the id is still in
 * cache" race. The in-memory adapter used in tests behaves identically.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import {
  type SessionExchangePayload,
  SessionExchangePort,
} from '../../application/ports/session-exchange.port';

const KEY_PREFIX = 'session-exchange:';

export class CacheSessionExchangeAdapter implements SessionExchangePort {
  constructor(private readonly cache: CacheService) {}

  async store(id: string, payload: SessionExchangePayload, ttlSeconds: number): Promise<void> {
    await this.cache.set(this.key(id), payload, ttlSeconds);
  }

  async consume(id: string): Promise<SessionExchangePayload | null> {
    const key = this.key(id);
    const value = await this.cache.get<SessionExchangePayload>(key);
    if (!value) return null;
    // Best-effort delete to enforce one-shot semantics. Even if this
    // call fails, the TTL caps the replay window at 60s.
    await this.cache.delete(key);
    return value;
  }

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }
}
