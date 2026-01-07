/**
 * Cache Lock Service
 * Single Responsibility: Distributed locking operations
 *
 * BUG-004 FIX: When Redis is disabled, lock operations now throw errors
 * instead of silently allowing operations to proceed unprotected.
 */

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';
import { ERROR_MESSAGES } from '../constants/config';

export interface LockOptions {
  /**
   * If true, allows operation to proceed without lock when Redis is unavailable.
   * Use ONLY for non-critical operations where race conditions are acceptable.
   * Default: false (strict mode - throws if Redis unavailable)
   */
  allowWithoutLock?: boolean;
}

@Injectable()
export class CacheLockService {
  constructor(
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Acquire a distributed lock using SETNX
   * Returns true if lock was acquired, false if already locked
   *
   * BUG-004 FIX: Now throws ServiceUnavailableException when Redis is disabled
   * unless explicitly allowed via options.allowWithoutLock
   */
  async acquireLock(
    key: string,
    ttl: number,
    options: LockOptions = {},
  ): Promise<boolean> {
    const { allowWithoutLock = false } = options;

    if (!this.redisConnection.isEnabled || !this.redisConnection.client) {
      if (allowWithoutLock) {
        this.logger.warn(
          `Redis disabled, proceeding without lock: ${key}`,
          'CacheLockService',
        );
        return true;
      }
      // BUG-004 FIX: Throw error instead of silently allowing
      this.logger.error(
        `Attempted to acquire lock without Redis: ${key}`,
        undefined,
        'CacheLockService',
      );
      throw new ServiceUnavailableException(
        ERROR_MESSAGES.DISTRIBUTED_LOCK_UNAVAILABLE,
      );
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

  /**
   * Check if Redis/distributed locking is available
   */
  isAvailable(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }
}
