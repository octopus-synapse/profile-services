/**
 * Cache Service (Facade)
 * Provides unified API for caching operations
 * Delegates to specialized services for implementation
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';
import { CacheCoreService } from './services/cache-core.service';
import { CachePatternsService } from './services/cache-patterns.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(
    private readonly coreService: CacheCoreService,
    private readonly patternsService: CachePatternsService,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.coreService.get<T>(key);
  }

  /**
   * Get value from cache with security guarantees.
   * Throws error if cache is unavailable or read fails.
   * Use for security-critical operations like token invalidation checks.
   */
  async getSecure<T>(key: string): Promise<T | null> {
    return this.coreService.getSecure<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.coreService.set(key, value, ttl);
  }

  /**
   * Set value in cache with security guarantees.
   * Throws error if cache is unavailable or write fails.
   * Use for security-critical operations like session invalidation.
   */
  async setSecure(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.coreService.setSecure(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    return this.coreService.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    return this.coreService.deletePattern(pattern);
  }

  async flush(): Promise<void> {
    return this.coreService.flush();
  }

  async acquireLock(key: string, ttl: number): Promise<boolean> {
    return this.patternsService.acquireLock(key, ttl);
  }

  async releaseLock(key: string): Promise<void> {
    return this.patternsService.releaseLock(key);
  }

  async isLocked(key: string): Promise<boolean> {
    return this.patternsService.isLocked(key);
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(key: string, computeFn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.patternsService.getOrSet(key, computeFn, ttl);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisConnection.onModuleDestroy();
  }

  get isEnabled(): boolean {
    return this.coreService.isEnabled;
  }
}
