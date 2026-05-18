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
    public override readonly cause?: Error,
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
    public override readonly cause?: Error,
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
      this.logger.error(`Failed to get cache key: ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      this.logger.error(`Failed to get cache key (secure): ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      this.logger.error(`Failed to set cache key: ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      this.logger.error(`Failed to set cache key (secure): ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new CacheWriteError(
        `Failed to write security-critical cache key: ${key}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Atomic set-if-not-exists (Redis `SET key value NX EX ttl`).
   *
   * Returns `true` when this caller created the key, `false` when the
   * key already existed (someone else set it first). Used as a
   * single-step gate where a get-then-set has a race window (see
   * `Validate2faUseCase` replay protection — P3-#33).
   *
   * Fail-open: a cache outage returns `false`, which makes the caller
   * treat the lock as "lost" and degrade safely. Callers that need
   * fail-closed semantics should use `setSecure` + an explicit check.
   */
  async setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (!this.isEnabled) return false;

    const client = this.redisConnection.client;
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      const result = await client.set(key, serialized, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed setIfAbsent for key: ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
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
      this.logger.error(`Failed to delete cache key: ${key}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Delete keys matching pattern.
   *
   * P0-#13: previously called `client.keys(pattern)` — `KEYS *` is O(N) over
   * the entire keyspace and blocks the single-threaded Redis until it
   * returns. In production with millions of keys this stalls every other
   * client for seconds at a time and is the documented anti-pattern.
   *
   * Now uses `scanStream({ match, count })` to walk the keyspace in
   * 200-key chunks and `UNLINK` (async free) instead of `DEL` (synchronous
   * free). Throughput per invocation is similar; the Redis stays responsive
   * to other clients throughout.
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled) return;

    const client = this.redisConnection.client;
    if (!client) return;

    // Cheap guard against accidental wholesale flushes — `deletePattern('')`
    // or a single-character pattern would otherwise sweep the whole cache.
    // Callers that *want* to flush the DB use `flush()` explicitly.
    if (!pattern || pattern.length < 3) {
      this.logger.warn(
        `Refusing deletePattern with overly broad match: "${pattern}"`,
        'CacheCoreService',
      );
      return;
    }

    try {
      const stream = client.scanStream({ match: pattern, count: 200 });
      let pendingDeletes: Promise<unknown>[] = [];
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length === 0) continue;
        // ioredis exposes `unlink` as a variadic command; we batch within
        // each scan chunk to keep per-call overhead bounded.
        pendingDeletes.push(client.unlink(...keys));
        if (pendingDeletes.length >= 10) {
          await Promise.all(pendingDeletes);
          pendingDeletes = [];
        }
      }
      if (pendingDeletes.length > 0) {
        await Promise.all(pendingDeletes);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern: ${pattern}`, {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      this.logger.error('Failed to flush cache', {
        context: 'CacheCoreService',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Check if cache is enabled
   */
  get isEnabled(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }
}
