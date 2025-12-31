/**
 * Cache Core Service
 * Handles basic cache operations (get, set, delete, flush)
 */

import { Injectable } from '@nestjs/common';
import { RedisConnectionService } from '../redis-connection.service';
import { AppLoggerService } from '../../logger/logger.service';

@Injectable()
export class CacheCoreService {
  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    const client = this.redisConnection.client;
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logError(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isEnabled) return;

    const client = this.redisConnection.client;
    if (!client) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      this.logError(`Failed to set cache key: ${key}`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled) return;

    const client = this.redisConnection.client;
    if (!client) return;

    try {
      await client.del(key);
    } catch (error) {
      this.logError(`Failed to delete cache key: ${key}`, error);
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled) return;

    const client = this.redisConnection.client;
    if (!client) return;

    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logError(`Failed to delete cache pattern: ${pattern}`, error);
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    if (!this.isEnabled) return;

    const client = this.redisConnection.client;
    if (!client) return;

    try {
      await client.flushdb();
      this.logger.log('Cache flushed successfully', 'CacheCoreService');
    } catch (error) {
      this.logError('Failed to flush cache', error);
    }
  }

  /**
   * Check if cache is enabled
   */
  get isEnabled(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : undefined,
      'CacheCoreService',
    );
  }
}
