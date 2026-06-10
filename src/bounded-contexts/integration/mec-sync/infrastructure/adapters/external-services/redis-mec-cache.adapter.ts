/**
 * Adapter from `MecCachePort` onto the framework-free `CachePort`
 * (Redis-backed in production, in-memory in dev without Redis).
 *
 * Lock semantics: `MecCachePort` wants key-addressed locks
 * (`acquireLock → boolean`, `releaseLock(key)`, `isLocked(key)`) while
 * `CachePort.acquireLock` returns a `CacheLock` handle. Rather than
 * holding handles in process memory (release would break across
 * instances), the lock is implemented directly on the port's atomic
 * primitives: `setIfAbsent` (Redis `SET NX EX`) + `delete` + `get`.
 *
 * The previous version typed the constructor as the Nest-era
 * `CacheService` and delegated `releaseLock`/`isLocked` — methods the
 * actually-injected `CachePort` doesn't have. The `as never` cast at
 * the composition call site hid the mismatch and every sync 500'd in
 * `finally` (and leaked the sync lock until its TTL).
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { MecCachePort } from '../../../domain/ports/mec-cache.port';

export class RedisMecCacheAdapter extends MecCachePort {
  constructor(private readonly cache: CachePort) {
    super();
  }

  get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  set(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.cache.set(key, value, ttl);
  }

  delete(key: string): Promise<void> {
    return this.cache.delete(key);
  }

  deletePattern(pattern: string): Promise<void> {
    return this.cache.deletePattern(pattern);
  }

  acquireLock(key: string, ttl: number): Promise<boolean> {
    return this.cache.setIfAbsent(key, Date.now().toString(), ttl);
  }

  releaseLock(key: string): Promise<void> {
    return this.cache.delete(key);
  }

  async isLocked(key: string): Promise<boolean> {
    return (await this.cache.get(key)) !== null;
  }
}
