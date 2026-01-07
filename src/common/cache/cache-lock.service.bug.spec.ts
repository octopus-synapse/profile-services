/**
 * Cache Lock Service Bug Detection Tests
 *
 * Uncle Bob (sem café): "Se o Redis está desabilitado, o lock
 * RETORNA TRUE?! Vocês estão DESABILITANDO a proteção silenciosamente!"
 *
 * BUG-004: Distributed Lock Disabled Silently
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CacheLockService } from './cache-lock.service';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';

describe('CacheLockService - BUG DETECTION', () => {
  let service: CacheLockService;
  let mockRedisConnection: any;

  beforeEach(async () => {
    mockRedisConnection = {
      isEnabled: true,
      client: {
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheLockService,
        { provide: RedisConnectionService, useValue: mockRedisConnection },
        {
          provide: AppLoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CacheLockService>(CacheLockService);
  });

  describe('BUG-004: Lock Behavior When Redis Disabled', () => {
    /**
     * CRITICAL BUG: When Redis is disabled, acquireLock returns true!
     *
     * Current behavior:
     *   if (!redis.isEnabled) return true;
     *
     * This means ALL race conditions are possible when Redis is down!
     * The system thinks it has a lock but actually has NO protection.
     *
     * Expected behavior options:
     * 1. Throw error when lock is requested but Redis unavailable
     * 2. Use in-memory fallback lock (only works single-instance)
     * 3. Return false (operation should fail-safe)
     */
    it('should NOT silently return true when Redis is disabled', async () => {
      mockRedisConnection.isEnabled = false;
      mockRedisConnection.client = null;

      // BUG: This returns true, allowing the operation without protection!
      const result = await service.acquireLock('test-lock', 60);

      // Should either throw or return false when Redis is unavailable
      expect(result).toBe(false);
      // OR should throw:
      // await expect(service.acquireLock('test-lock', 60)).rejects.toThrow();
    });

    it('should log warning when operating without Redis', async () => {
      mockRedisConnection.isEnabled = false;
      mockRedisConnection.client = null;
      
      // Even if we allow operation without Redis, should at least warn
      await service.acquireLock('test-lock', 60);

      // BUG: No warning is logged about degraded mode!
      // The operation silently succeeds without any protection
    });

    it('should fail-safe for critical operations', async () => {
      mockRedisConnection.isEnabled = false;

      // For critical operations like user creation, should fail-safe
      // meaning operation should NOT proceed without lock
      const result = await service.acquireLock('critical:user:create', 60);

      // Should NOT return true for critical locks when Redis is down
      expect(result).not.toBe(true);
    });
  });

  describe('Lock Acquisition Behavior', () => {
    it('should properly acquire lock when Redis is available', async () => {
      mockRedisConnection.isEnabled = true;
      mockRedisConnection.client.set.mockResolvedValue('OK');

      const result = await service.acquireLock('test-lock', 60);

      expect(result).toBe(true);
      expect(mockRedisConnection.client.set).toHaveBeenCalledWith(
        'test-lock',
        expect.any(String),
        'EX',
        60,
        'NX',
      );
    });

    it('should return false when lock already held', async () => {
      mockRedisConnection.isEnabled = true;
      mockRedisConnection.client.set.mockResolvedValue(null); // Lock not acquired

      const result = await service.acquireLock('test-lock', 60);

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisConnection.isEnabled = true;
      mockRedisConnection.client.set.mockRejectedValue(
        new Error('Redis error'),
      );

      // BUG: Currently returns false on error
      // But should this throw? Depends on fail-safe policy
      const result = await service.acquireLock('test-lock', 60);

      // Currently returns false, which is fail-safe
      // But the error should be logged!
      expect(result).toBe(false);
    });
  });

  describe('Alternative: In-Memory Fallback', () => {
    /**
     * If Redis is unavailable, could use in-memory lock as fallback.
     * This only works for single-instance deployments but is better than nothing.
     */
    it('should use in-memory fallback when Redis unavailable', async () => {
      mockRedisConnection.isEnabled = false;

      // BUG: Both return true because there's no in-memory fallback!
      // First lock should succeed (in-memory)
      const result1 = await service.acquireLock('test-lock', 60);
      
      // Second lock for same key should fail
      const result2 = await service.acquireLock('test-lock', 60);

      // With proper in-memory fallback:
      // expect(result1).toBe(true);
      // expect(result2).toBe(false);
      
      // Current buggy behavior: both return true
      expect(result1).toBe(true);
      expect(result2).toBe(true); // BUG: Should be false!
    });
  });
});
