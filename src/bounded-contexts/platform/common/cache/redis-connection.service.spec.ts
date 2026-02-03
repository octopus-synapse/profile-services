/**
 * Redis Connection Service Tests
 * Focus: Connection lifecycle management
 *
 * Key scenarios:
 * - Disabled when REDIS_HOST not configured
 * - Proper shutdown on module destroy
 * - Error handling during connection
 */

import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisConnectionService } from './redis-connection.service';
import { AppLoggerService } from '../logger/logger.service';

describe('RedisConnectionService', () => {
  let service: RedisConnectionService;
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
  };
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    fakeLogger = {
      log: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('when Redis is not configured', () => {
    beforeEach(async () => {
      // Ensure REDIS_HOST is not set
      delete process.env.REDIS_HOST;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisConnectionService,
          { provide: AppLoggerService, useValue: fakeLogger },
        ],
      }).compile();

      service = module.get<RedisConnectionService>(RedisConnectionService);
    });

    it('should be disabled', () => {
      expect(service.isEnabled).toBe(false);
    });

    it('should have null client', () => {
      expect(service.client).toBe(null);
    });

    it('should log warning about disabled caching', () => {
      expect(fakeLogger.warn).toHaveBeenCalledWith(
        'Redis not configured - caching disabled',
        'RedisConnectionService',
      );
    });

    it('should handle onModuleDestroy gracefully when no client', async () => {
      await service.onModuleDestroy();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('when Redis host is configured but invalid', () => {
    beforeEach(async () => {
      // Set invalid Redis config that will fail to connect
      process.env.REDIS_HOST = 'invalid-host-that-does-not-exist';
      process.env.REDIS_PORT = '9999';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisConnectionService,
          { provide: AppLoggerService, useValue: fakeLogger },
        ],
      }).compile();

      service = module.get<RedisConnectionService>(RedisConnectionService);
    });

    afterEach(async () => {
      // Clean up - service tries to connect, need to destroy
      await service.onModuleDestroy();
    });

    it('should be enabled initially', () => {
      expect(service.isEnabled).toBe(true);
    });

    it('should have a client instance (even if connection fails)', () => {
      // ioredis creates the client object even if connection fails
      expect(service.client).not.toBe(null);
    });
  });

  describe('onModuleDestroy', () => {
    it('should set client to null after destroy', async () => {
      delete process.env.REDIS_HOST;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisConnectionService,
          { provide: AppLoggerService, useValue: fakeLogger },
        ],
      }).compile();

      service = module.get<RedisConnectionService>(RedisConnectionService);

      await service.onModuleDestroy();

      expect(service.client).toBe(null);
    });
  });
});
