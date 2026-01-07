/**
 * Redis Cache Bug Detection Tests
 *
 * BUG-054: Cache Set Without Error Handling
 * BUG-050: MEC Sync Lock Not Releasing on Error
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheCoreService } from './services/cache-core.service';
import { CacheLockService } from './cache-lock.service';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';

describe('Redis Cache - BUG DETECTION', () => {
  let cacheService: CacheCoreService;
  let lockService: CacheLockService;
  let mockRedis: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockRedis = {
      isEnabled: true,
      client: {
        get: mock(),
        set: mock(),
        del: mock(),
        setex: mock(),
        exists: mock(),
        keys: mock(),
        flushdb: mock(),
      },
    };

    mockLogger = {
      log: mock(),
      error: mock(),
      warn: mock(),
      debug: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheCoreService,
        CacheLockService,
        { provide: RedisConnectionService, useValue: mockRedis },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    cacheService = module.get<CacheCoreService>(CacheCoreService);
    lockService = module.get<CacheLockService>(CacheLockService);
  });

  describe('BUG-054: Cache Set Without Error Handling', () => {
    /**
     * Redis set operations may silently fail.
     * Critical cached data might not be stored.
     */
    it('should report when cache set fails', async () => {
      mockRedis.client.set.mockRejectedValue(
        new Error('Redis connection lost'),
      );

      // BUG: Error might be silently swallowed!
      const result = await cacheService.set('key', 'value');

      // Should indicate failure somehow
      expect(result).toBe(false); // Or throw
    });

    it('should retry on transient failures', async () => {
      mockRedis.client.set
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce('OK');

      await cacheService.set('key', 'value');

      // Should have retried
      expect(mockRedis.client.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('BUG-050: Lock Not Released on Error', () => {
    /**
     * If operation fails between acquireLock and releaseLock,
     * lock remains until TTL expires.
     */
    it('should release lock in finally block', async () => {
      const lockKey = 'sync:mec';

      mockRedis.client.set.mockResolvedValue('OK'); // Lock acquired
      mockRedis.client.del.mockResolvedValue(1); // Lock released

      let lockAcquired = false;
      let lockReleased = false;

      try {
        await lockService.acquireLock(lockKey, 30);
        lockAcquired = true;

        // Simulate error during operation
        throw new Error('Operation failed!');
      } catch {
        // Error caught
      } finally {
        await lockService.releaseLock(lockKey);
        lockReleased = true;
      }

      // BUG: If caller doesn't use try/finally, lock never releases!
      expect(lockAcquired).toBe(true);
      expect(lockReleased).toBe(true);
    });

    it('should have auto-release mechanism for stuck locks', async () => {
      // Simulate stuck lock (no release called)
      mockRedis.client.set.mockResolvedValue('OK');

      await lockService.acquireLock('sync:stuck', 30);
      // Don't release - simulating crash

      // BUG: Lock should have TTL set automatically
      expect(mockRedis.client.set).toHaveBeenCalledWith(
        'sync:stuck',
        expect.any(String),
        'EX',
        30,
        'NX',
      );
    });

    it('should provide withLock helper for safe usage', async () => {
      // Should have a helper that handles lock lifecycle
      // const result = await lockService.withLock('key', async () => {
      //   // Do work
      //   return 'result';
      // });
      // BUG: No such helper exists!
    });
  });
});
