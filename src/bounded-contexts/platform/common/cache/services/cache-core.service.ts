/**
 * Cache Core Service
 * Handles basic cache operations (get, set, delete, flush)
 */

import { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { RedisConnectionService } from '../redis-connection.service';

/**
 * Error thrown when cache is unavailable for security-critical operations.
 */
export class CacheUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheUnavailableError';
  }
}

/**
 * Error thrown when a cache read operation fails.
 */
export class CacheReadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'CacheReadError';
  }
}

/**
 * Error thrown when a cache write operation fails.
 */
export class CacheWriteError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'CacheWriteError';
  }
}

export class CacheCoreService {
  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Get value from cache (fail-open: returns null on error)
   * Use for non-critical cache lookups where missing data is acceptable.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    const client = this.redisConnection.client;
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
      return null;
    }
  }

  /**
   * Get value from cache with security guarantees (fail-closed: throws on error)
   * Use for security-critical operations where silent failures are unacceptable.
   *
   * @throws CacheUnavailableError if cache is disabled or unavailable
   * @throws CacheReadError if the read operation fails
   */
  async getSecure<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) {
      throw new CacheUnavailableError('Cache is disabled - cannot perform secure lookup');
    }

    const client = this.redisConnection.client;
    if (!client) {
      throw new CacheUnavailableError('Redis client not connected');
    }

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get cache key (secure): ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
      throw new CacheReadError(
        `Failed to read security-critical cache key: ${key}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Set value in cache (fail-open: ignores errors)
   * Use for non-critical cache operations where missing data is acceptable.
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
      this.logger.error(
        `Failed to set cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
    }
  }

  /**
   * Set value in cache with security guarantees (fail-closed: throws on error)
   * Use for security-critical operations where silent failures are unacceptable.
   *
   * @throws CacheUnavailableError if cache is disabled or unavailable
   * @throws CacheWriteError if the write operation fails
   */
  async setSecure(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isEnabled) {
      throw new CacheUnavailableError('Cache is disabled - cannot perform secure write');
    }

    const client = this.redisConnection.client;
    if (!client) {
      throw new CacheUnavailableError('Redis client not connected');
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(
        `Failed to set cache key (secure): ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
      throw new CacheWriteError(
        `Failed to write security-critical cache key: ${key}`,
        error instanceof Error ? error : undefined,
      );
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
      this.logger.error(
        `Failed to delete cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
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
      this.logger.error(
        `Failed to delete cache pattern: ${pattern}`,
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
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
      this.logger.error(
        'Failed to flush cache',
        error instanceof Error ? error.stack : undefined,
        'CacheCoreService',
      );
    }
  }

  /**
   * Check if cache is enabled
   */
  get isEnabled(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }
}
