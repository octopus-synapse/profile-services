/**
 * Rate Limit Service Tests
 *
 * Tests for granular rate limiting functionality.
 * Follows TDD - RED phase: tests written before implementation.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 * Uncle Bob: "Clean tests are precise specifications"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { CacheService } from '../cache/cache.service';
import type { RateLimitResult } from './rate-limit.types';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let mockCacheService: {
    get: ReturnType<typeof mock>;
    set: ReturnType<typeof mock>;
    increment: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    mockCacheService = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
      increment: mock(() => Promise.resolve(1)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  describe('generateKey', () => {
    it('should generate IP-based key', () => {
      const key = service.generateKey({
        keyStrategy: 'ip',
        ip: '192.168.1.1',
      });

      expect(key).toBe('ratelimit:ip:192.168.1.1');
    });

    it('should generate user-based key', () => {
      const key = service.generateKey({
        keyStrategy: 'user',
        userId: 'user-123',
      });

      expect(key).toBe('ratelimit:user:user-123');
    });

    it('should generate IP-and-endpoint key', () => {
      const key = service.generateKey({
        keyStrategy: 'ip-and-endpoint',
        ip: '192.168.1.1',
        endpoint: 'POST:/api/v1/auth/login',
      });

      expect(key).toBe('ratelimit:ip:192.168.1.1:POST:/api/v1/auth/login');
    });

    it('should generate user-and-endpoint key', () => {
      const key = service.generateKey({
        keyStrategy: 'user-and-endpoint',
        userId: 'user-123',
        endpoint: 'POST:/api/v1/resumes/export',
      });

      expect(key).toBe('ratelimit:user:user-123:POST:/api/v1/resumes/export');
    });

    it('should fallback to IP when user not available for user strategy', () => {
      const key = service.generateKey({
        keyStrategy: 'user',
        ip: '192.168.1.1',
      });

      expect(key).toBe('ratelimit:ip:192.168.1.1');
    });
  });

  describe('consume', () => {
    it('should allow request when under limit', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.increment.mockResolvedValue(1);

      const result = await service.consume('test-key', {
        points: 100,
        duration: 60,
      });

      expect(result.isBlocked).toBe(false);
      expect(result.remainingPoints).toBe(99);
      expect(result.consumedPoints).toBe(1);
    });

    it('should block request when at limit', async () => {
      mockCacheService.get.mockResolvedValue({
        count: 100,
        expiresAt: Date.now() + 30000,
      });

      const result = await service.consume('test-key', {
        points: 100,
        duration: 60,
      });

      expect(result.isBlocked).toBe(true);
      expect(result.remainingPoints).toBe(0);
    });

    it('should calculate correct remaining points', async () => {
      mockCacheService.get.mockResolvedValue({
        count: 50,
        expiresAt: Date.now() + 30000,
      });
      mockCacheService.increment.mockResolvedValue(51);

      const result = await service.consume('test-key', {
        points: 100,
        duration: 60,
      });

      expect(result.remainingPoints).toBe(49);
      expect(result.consumedPoints).toBe(51);
    });

    it('should reset counter when window expires', async () => {
      mockCacheService.get.mockResolvedValue({
        count: 100,
        expiresAt: Date.now() - 1000,
      });
      mockCacheService.increment.mockResolvedValue(1);

      const result = await service.consume('test-key', {
        points: 100,
        duration: 60,
      });

      expect(result.isBlocked).toBe(false);
      expect(result.consumedPoints).toBe(1);
    });
  });

  describe('getHeaders', () => {
    it('should return standard rate limit headers', () => {
      const result: RateLimitResult = {
        remainingPoints: 95,
        msBeforeNext: 30000,
        consumedPoints: 5,
        isBlocked: false,
      };

      const headers = service.getHeaders(result, { points: 100, duration: 60 });

      expect(headers['X-RateLimit-Limit']).toBe(100);
      expect(headers['X-RateLimit-Remaining']).toBe(95);
      expect(headers['X-RateLimit-Reset']).toBeGreaterThan(
        Math.floor(Date.now() / 1000),
      );
    });

    it('should include Retry-After header when blocked', () => {
      const result: RateLimitResult = {
        remainingPoints: 0,
        msBeforeNext: 30000,
        consumedPoints: 100,
        isBlocked: true,
      };

      const headers = service.getHeaders(result, { points: 100, duration: 60 });

      expect(headers['Retry-After']).toBe(30);
    });
  });

  describe('getContextConfig', () => {
    it('should return global config for unauthenticated requests', () => {
      const config = service.getContextConfig({ isAuthenticated: false });

      expect(config.points).toBe(100);
      expect(config.duration).toBe(60);
    });

    it('should return authenticated config for logged-in users', () => {
      const config = service.getContextConfig({ isAuthenticated: true });

      expect(config.points).toBe(1000);
      expect(config.duration).toBe(60);
    });

    it('should return auth config for auth endpoints', () => {
      const config = service.getContextConfig({
        isAuthenticated: false,
        isAuthEndpoint: true,
      });

      expect(config.points).toBe(10);
      expect(config.duration).toBe(900);
    });

    it('should return expensive config when specified', () => {
      const config = service.getContextConfig({
        isAuthenticated: true,
        isExpensiveOperation: true,
      });

      expect(config.points).toBe(5);
    });
  });

  describe('isBlocked', () => {
    it('should return false when under limit', async () => {
      mockCacheService.get.mockResolvedValue({
        count: 50,
        expiresAt: Date.now() + 30000,
      });

      const blocked = await service.isBlocked('test-key', {
        points: 100,
        duration: 60,
      });

      expect(blocked).toBe(false);
    });

    it('should return true when at or over limit', async () => {
      mockCacheService.get.mockResolvedValue({
        count: 100,
        expiresAt: Date.now() + 30000,
      });

      const blocked = await service.isBlocked('test-key', {
        points: 100,
        duration: 60,
      });

      expect(blocked).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear rate limit for key', async () => {
      await service.reset('test-key');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({ count: 0 }),
        expect.any(Number),
      );
    });
  });
});
