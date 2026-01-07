/**
 * CacheCoreService Tests
 *
 * Tests for basic cache operations including error scenarios.
 * Kent Beck: "Test the error paths as thoroughly as the happy paths."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheCoreService } from './cache-core.service';
import { RedisConnectionService } from '../redis-connection.service';
import { AppLoggerService } from '../../logger/logger.service';

describe('CacheCoreService', () => {
  let service: CacheCoreService;
  let mockClient: any;
  let mockLogger: AppLoggerService;
  let mockRedisConnection: any;

  beforeEach(async () => {
    mockClient = {
      get: mock(),
      set: mock(),
      setex: mock(),
      del: mock(),
      keys: mock(),
      flushdb: mock(),
    };

    mockLogger = {
      log: mock(),
      error: mock(),
      warn: mock(),
      debug: mock(),
    } as any;

    mockRedisConnection = {
      client: mockClient,
      isEnabled: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheCoreService,
        { provide: RedisConnectionService, useValue: mockRedisConnection },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CacheCoreService>(CacheCoreService);
  });

  describe('get', () => {
    it('should return parsed value on success', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ name: 'test' }));

      const result = await service.get<{ name: string }>('key');

      expect(result).toEqual({ name: 'test' });
    });

    it('should return null on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });

    it('should return null and log error on Redis failure', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('key');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get cache key'),
        expect.any(String),
        'CacheCoreService',
      );
    });

    it('should return null when cache is disabled', async () => {
      mockRedisConnection.isEnabled = false;

      const result = await service.get('key');

      expect(result).toBeNull();
      expect(mockClient.get.mock.calls.length).toBe(0);
    });

    it('should return null when client is null', async () => {
      mockRedisConnection.client = null;

      const result = await service.get('key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('key', { data: 'value' });

      expect(mockClient.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ data: 'value' }),
      );
    });

    it('should set value with TTL', async () => {
      mockClient.setex.mockResolvedValue('OK');

      await service.set('key', { data: 'value' }, 3600);

      expect(mockClient.setex).toHaveBeenCalledWith(
        'key',
        3600,
        JSON.stringify({ data: 'value' }),
      );
    });

    it('should log error on Redis failure', async () => {
      mockClient.set.mockRejectedValue(new Error('Redis write failed'));

      await service.set('key', 'value');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set cache key'),
        expect.any(String),
        'CacheCoreService',
      );
    });

    it('should do nothing when cache is disabled', async () => {
      mockRedisConnection.isEnabled = false;

      await service.set('key', 'value');

      expect(mockClient.set.mock.calls.length).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      mockClient.del.mockResolvedValue(1);

      await service.delete('key');

      expect(mockClient.del).toHaveBeenCalledWith('key');
    });

    it('should log error on Redis failure', async () => {
      mockClient.del.mockRejectedValue(new Error('Redis delete failed'));

      await service.delete('key');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete cache key'),
        expect.any(String),
        'CacheCoreService',
      );
    });

    it('should do nothing when cache is disabled', async () => {
      mockRedisConnection.isEnabled = false;

      await service.delete('key');

      expect(mockClient.del.mock.calls.length).toBe(0);
    });
  });

  describe('deletePattern', () => {
    it('should delete all matching keys', async () => {
      mockClient.keys.mockResolvedValue(['user:1', 'user:2']);
      mockClient.del.mockResolvedValue(2);

      await service.deletePattern('user:*');

      expect(mockClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockClient.del).toHaveBeenCalledWith('user:1', 'user:2');
    });

    it('should not call del when no keys match', async () => {
      mockClient.keys.mockResolvedValue([]);

      await service.deletePattern('nonexistent:*');

      expect(mockClient.del.mock.calls.length).toBe(0);
    });

    it('should log error on Redis failure', async () => {
      mockClient.keys.mockRejectedValue(new Error('Redis keys failed'));

      await service.deletePattern('user:*');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete cache pattern'),
        expect.any(String),
        'CacheCoreService',
      );
    });

    it('should do nothing when cache is disabled', async () => {
      mockRedisConnection.isEnabled = false;

      await service.deletePattern('user:*');

      expect(mockClient.keys.mock.calls.length).toBe(0);
    });
  });

  describe('flush', () => {
    it('should flush database and log success', async () => {
      mockClient.flushdb.mockResolvedValue('OK');

      await service.flush();

      expect(mockClient.flushdb).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Cache flushed successfully',
        'CacheCoreService',
      );
    });

    it('should log error on Redis failure', async () => {
      mockClient.flushdb.mockRejectedValue(new Error('Redis flush failed'));

      await service.flush();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush cache'),
        expect.any(String),
        'CacheCoreService',
      );
    });

    it('should do nothing when cache is disabled', async () => {
      mockRedisConnection.isEnabled = false;

      await service.flush();

      expect(mockClient.flushdb.mock.calls.length).toBe(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when Redis is enabled and client exists', () => {
      mockRedisConnection.isEnabled = true;
      mockRedisConnection.client = mockClient;

      expect(service.isEnabled).toBe(true);
    });

    it('should return false when Redis is disabled', () => {
      mockRedisConnection.isEnabled = false;

      expect(service.isEnabled).toBe(false);
    });

    it('should return false when client is null', () => {
      mockRedisConnection.isEnabled = true;
      mockRedisConnection.client = null;

      expect(service.isEnabled).toBe(false);
    });
  });
});
