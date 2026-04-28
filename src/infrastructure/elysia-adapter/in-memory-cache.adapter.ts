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
}
