/**
 * Cache Lock Service
 * Single Responsibility: Distributed locking operations
 */

import { Injectable } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class CacheLockService {
  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Acquire a distributed lock using SETNX
   * Returns true if lock was acquired, false if already locked
   */
  async acquireLock(key: string, ttl: number): Promise<boolean> {
    if (!this.redisConnection.isEnabled || !this.redisConnection.client) {
      return true; // Allow operation if Redis is disabled
    }

    try {
      const result = await this.redisConnection.client.set(
        key,
        Date.now().toString(),
        'EX',
        ttl,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error(
        `Failed to acquire lock: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheLockService',
      );
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    if (!this.redisConnection.isEnabled || !this.redisConnection.client) {
      return;
    }

    try {
      await this.redisConnection.client.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to release lock: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheLockService',
      );
    }
  }

  /**
   * Check if a lock exists
   */
  async isLocked(key: string): Promise<boolean> {
    if (!this.redisConnection.isEnabled || !this.redisConnection.client) {
      return false;
    }

    try {
      const exists = await this.redisConnection.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check lock: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'CacheLockService',
      );
      return false;
    }
  }
}
