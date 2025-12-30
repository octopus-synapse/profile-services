/**
 * Cache Service (Facade)
 * Provides unified API for caching operations
 * Delegates to specialized services for implementation
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';
import { CacheLockService } from './cache-lock.service';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly lockService: CacheLockService,
    private readonly logger: AppLoggerService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    try {
      const value = await this.redisConnection.client!.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logError(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redisConnection.client!.setex(key, ttl, serialized);
      } else {
        await this.redisConnection.client!.set(key, serialized);
      }
    } catch (error) {
      this.logError(`Failed to set cache key: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redisConnection.client!.del(key);
    } catch (error) {
      this.logError(`Failed to delete cache key: ${key}`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const keys = await this.redisConnection.client!.keys(pattern);
      if (keys.length > 0) {
        await this.redisConnection.client!.del(...keys);
      }
    } catch (error) {
      this.logError(`Failed to delete cache pattern: ${pattern}`, error);
    }
  }

  async flush(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redisConnection.client!.flushdb();
      this.logger.log('Cache flushed successfully', 'CacheService');
    } catch (error) {
      this.logError('Failed to flush cache', error);
    }
  }

  async acquireLock(key: string, ttl: number): Promise<boolean> {
    return this.lockService.acquireLock(key, ttl);
  }

  async releaseLock(key: string): Promise<void> {
    return this.lockService.releaseLock(key);
  }

  async isLocked(key: string): Promise<boolean> {
    return this.lockService.isLocked(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisConnection.onModuleDestroy();
  }

  get isEnabled(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : undefined,
      'CacheService',
    );
  }
}
