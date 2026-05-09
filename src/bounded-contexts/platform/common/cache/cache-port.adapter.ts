/**
 * Adapter wrapping the existing Nest `CacheService` so it satisfies the
 * framework-free `CachePort`. Lets compositions accept `CachePort`
 * uniformly while the legacy Nest path keeps consuming `CacheService`
 * for `getOrSet`, `setSecure`, etc.
 *
 * Lock semantics: `CacheService.acquireLock` returns `boolean` (legacy);
 * `CachePort.acquireLock` returns `CacheLock | null`. This adapter
 * synthesizes the `release` callback by calling
 * `CacheService.releaseLock(key)` so existing call sites are unchanged.
 */

import { type CacheLock, CachePort } from '@/shared-kernel/cache/cache.port';
import type { CacheService } from './cache.service';

export class CacheServicePortAdapter extends CachePort {
  constructor(private readonly inner: CacheService) {
    super();
  }

  get isEnabled(): boolean {
    return this.inner.isEnabled;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.inner.get<T>(key);
  }

  async getSecure<T>(key: string): Promise<T | null> {
    return this.inner.getSecure<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.inner.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    return this.inner.deletePattern(pattern);
  }

  async flush(): Promise<void> {
    return this.inner.flush();
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<CacheLock | null> {
    const acquired = await this.inner.acquireLock(key, ttlSeconds);
    if (!acquired) return null;
    return { release: async () => this.inner.releaseLock(key) };
  }

  /** Override the base impl to delegate to `CacheService.getOrSet` (which
   *  uses Redis SETNX-style locking under the hood — preferable to the
   *  base port's get-then-set race-prone fallback). */
  override async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    return this.inner.getOrSet(key, fn, ttlSeconds);
  }
}
