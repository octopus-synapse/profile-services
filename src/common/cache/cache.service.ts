import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private client: Redis | null = null;
  private readonly isEnabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    this.isEnabled = !!redisHost;

    if (this.isEnabled) {
      try {
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.client.on('connect', () => {
          this.logger.log('Redis connected successfully', 'CacheService');
        });

        this.client.on('error', (error) => {
          this.logger.error(
            'Redis connection error',
            error.stack,
            'CacheService',
            { error: error.message },
          );
        });
      } catch (error) {
        this.logger.error(
          'Failed to initialize Redis client',
          error instanceof Error ? error.stack : undefined,
          'CacheService',
        );
        this.isEnabled = false;
      }
    } else {
      this.logger.warn(
        'Redis not configured - caching disabled',
        'CacheService',
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(
        `Failed to set cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete cache key: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete cache pattern: ${pattern}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
    }
  }

  async flush(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      await this.client.flushdb();
      this.logger.log('Cache flushed successfully', 'CacheService');
    } catch (error) {
      this.logger.error(
        'Failed to flush cache',
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
    }
  }

  /**
   * Acquire a distributed lock using SETNX
   * Returns true if lock was acquired, false if already locked
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      // If Redis is disabled, allow operation (no distributed coordination)
      return true;
    }

    try {
      const result = await this.client.set(key, Date.now().toString(), 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(
        `Failed to acquire lock: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    await this.delete(key);
  }

  /**
   * Check if a lock exists
   */
  async isLocked(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check lock: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheService',
      );
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed', 'CacheService');
    }
  }
}
