/**
 * Adapter from `MecCachePort` onto the platform `CacheService` (Redis-
 * backed in production, in-memory in tests). Pure delegation — the
 * platform service already exposes the right surface.
 */

import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { MecCachePort } from '../../../domain/ports/mec-cache.port';

export class RedisMecCacheAdapter extends MecCachePort {
  constructor(private readonly cache: CacheService) {
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
    return this.cache.acquireLock(key, ttl);
  }

  releaseLock(key: string): Promise<void> {
    return this.cache.releaseLock(key);
  }

  isLocked(key: string): Promise<boolean> {
    return this.cache.isLocked(key);
  }
}
