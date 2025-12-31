/**
 * Cache Patterns Service
 * Implements common cache patterns (locks, cache-aside, etc.)
 */

import { Injectable } from '@nestjs/common';
import { CacheLockService } from '../cache-lock.service';
import { CacheCoreService } from './cache-core.service';

@Injectable()
export class CachePatternsService {
  constructor(
    private readonly lockService: CacheLockService,
    private readonly coreService: CacheCoreService,
  ) {}

  /**
   * Acquire distributed lock
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    return this.lockService.acquireLock(key, ttl);
  }

  /**
   * Release distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    return this.lockService.releaseLock(key);
  }

  /**
   * Check if lock is held
   */
  async isLocked(key: string): Promise<boolean> {
    return this.lockService.isLocked(key);
  }

  /**
   * Cache-aside pattern: get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.coreService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    await this.coreService.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache and related patterns
   */
  async invalidatePattern(pattern: string): Promise<void> {
    return this.coreService.deletePattern(pattern);
  }
}
