/**
 * In-memory `CachePort` impl for the Elysia POC. Sufficient for local
 * dev and the rate-limit stage; production swap-day uses a Redis-backed
 * adapter mirroring the existing `CacheService` semantics.
 *
 * Stores entries with optional TTL (seconds). `acquireLock` is a
 * single-process mutex via the same map — adequate for POC; distributed
 * locks need Redis SETNX in production.
 */

import { type CacheLock, CachePort } from '@/shared-kernel/cache/cache.port';

interface Entry {
  readonly value: unknown;
  readonly expiresAt: number;
}

export class InMemoryCacheAdapter extends CachePort {
  readonly isEnabled = true;
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt > 0 && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value as T;
  }

  async getSecure<T>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }

  async setSecure<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const re = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const k of this.store.keys()) {
      if (re.test(k)) this.store.delete(k);
    }
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<CacheLock | null> {
    const lockKey = `lock:${key}`;
    if (await this.get(lockKey)) return null;
    await this.set(lockKey, true, ttlSeconds);
    return { release: async () => this.delete(lockKey) };
  }

  /**
   * Atomic-by-construction in-memory increment. JS is single-threaded, but
   * `await` between read and write opens a window where two concurrent
   * pipeline stages can observe the same counter — we close that window by
   * reading and writing the map directly in one synchronous turn.
   */
  override async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const e = this.store.get(key);
    const now = Date.now();
    if (!e || (e.expiresAt > 0 && now > e.expiresAt)) {
      this.store.set(key, {
        value: 1,
        expiresAt: ttlSeconds > 0 ? now + ttlSeconds * 1000 : 0,
      });
      return 1;
    }
    const next = (typeof e.value === 'number' ? e.value : 0) + 1;
    // Preserve the original window so the rate-limit counter resets on the
    // window's own clock instead of sliding forward on every hit.
    this.store.set(key, { value: next, expiresAt: e.expiresAt });
    return next;
  }
}
