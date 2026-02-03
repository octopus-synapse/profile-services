/**
 * Cache Lock Service Tests
 * Focus: Distributed locking with Redis
 *
 * Key scenarios:
 * - BUG-004: Throws when Redis unavailable (strict mode)
 * - allowWithoutLock option bypasses Redis requirement
 * - Lock acquisition, release, and check operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { CacheLockService } from './cache-lock.service';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';

describe('CacheLockService', () => {
  let service: CacheLockService;
  let fakeRedisConnection: {
    client: {
      set: ReturnType<typeof mock>;
      del: ReturnType<typeof mock>;
      exists: ReturnType<typeof mock>;
    } | null;
    isEnabled: boolean;
  };
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
    debug: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    fakeRedisConnection = {
      client: {
        set: mock(() => Promise.resolve('OK')),
        del: mock(() => Promise.resolve(1)),
        exists: mock(() => Promise.resolve(0)),
      },
      isEnabled: true,
    };

    fakeLogger = {
      log: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
      error: mock(() => {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheLockService,
        { provide: RedisConnectionService, useValue: fakeRedisConnection },
        { provide: AppLoggerService, useValue: fakeLogger },
      ],
    }).compile();

    service = module.get<CacheLockService>(CacheLockService);
  });

  describe('acquireLock', () => {
    it('should acquire lock when Redis available', async () => {
      fakeRedisConnection.client!.set.mockResolvedValue('OK');

      const result = await service.acquireLock('test-lock', 60);

      expect(result).toBe(true);
      expect(fakeRedisConnection.client!.set).toHaveBeenCalledWith(
        'test-lock',
        expect.any(String),
        'EX',
        60,
        'NX',
      );
    });

    it('should return false when lock already exists', async () => {
      fakeRedisConnection.client!.set.mockResolvedValue(null);

      const result = await service.acquireLock('test-lock', 60);

      expect(result).toBe(false);
    });

    it('should throw ServiceUnavailableException when Redis unavailable (BUG-004)', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      await expect(service.acquireLock('test-lock', 60)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(fakeLogger.error).toHaveBeenCalled();
    });

    it('should proceed without lock when allowWithoutLock is true', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      const result = await service.acquireLock('test-lock', 60, {
        allowWithoutLock: true,
      });

      expect(result).toBe(true);
      expect(fakeLogger.warn).toHaveBeenCalled();
    });

    it('should return false when Redis operation fails', async () => {
      fakeRedisConnection.client!.set.mockRejectedValue(
        new Error('Redis error'),
      );

      const result = await service.acquireLock('test-lock', 60);

      expect(result).toBe(false);
      expect(fakeLogger.error).toHaveBeenCalled();
    });
  });

  describe('releaseLock', () => {
    it('should delete key from Redis', async () => {
      await service.releaseLock('test-lock');

      expect(fakeRedisConnection.client!.del).toHaveBeenCalledWith('test-lock');
    });

    it('should not throw when Redis unavailable', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      // Should complete without throwing
      await service.releaseLock('test-lock');
      expect(true).toBe(true); // If we get here, no exception was thrown
    });

    it('should log error when Redis operation fails', async () => {
      fakeRedisConnection.client!.del.mockRejectedValue(
        new Error('Redis error'),
      );

      await service.releaseLock('test-lock');

      expect(fakeLogger.error).toHaveBeenCalled();
    });
  });

  describe('isLocked', () => {
    it('should return true when key exists', async () => {
      fakeRedisConnection.client!.exists.mockResolvedValue(1);

      const result = await service.isLocked('test-lock');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      fakeRedisConnection.client!.exists.mockResolvedValue(0);

      const result = await service.isLocked('test-lock');

      expect(result).toBe(false);
    });

    it('should return false when Redis unavailable', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      const result = await service.isLocked('test-lock');

      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Redis enabled and client exists', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when Redis disabled', () => {
      fakeRedisConnection.isEnabled = false;

      expect(service.isAvailable()).toBe(false);
    });

    it('should return false when client is null', () => {
      fakeRedisConnection.client = null;

      expect(service.isAvailable()).toBe(false);
    });
  });
});
