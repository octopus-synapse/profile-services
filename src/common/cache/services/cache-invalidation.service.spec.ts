/**
 * CacheInvalidationService Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Test observable behavior, not implementation details."
 *
 * This service provides higher-level cache invalidation strategies
 * for common entities like resumes, users, and analytics.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CacheService } from '../cache.service';
import { AppLoggerService } from '../../logger/logger.service';

// --- Mocks ---

const createMockCacheService = () => ({
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  deletePattern: mock(() => Promise.resolve()),
  flush: mock(() => Promise.resolve()),
  isEnabled: true,
});

const createMockLogger = () => ({
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  let mockCacheService: ReturnType<typeof createMockCacheService>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockCacheService = createMockCacheService();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
  });

  describe('invalidateResume', () => {
    it('should invalidate all resume-related cache keys', async () => {
      const resumeId = 'res-123';
      const slug = 'my-resume';
      const userId = 'user-456';

      await service.invalidateResume({ resumeId, slug, userId });

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `resume:${resumeId}`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `public:resume:${slug}`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:${userId}:resumes`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:*:${resumeId}`,
      );
    });

    it('should handle missing slug gracefully', async () => {
      const resumeId = 'res-123';
      const userId = 'user-456';

      await service.invalidateResume({ resumeId, userId });

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `resume:${resumeId}`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:${userId}:resumes`,
      );
      // Should not attempt to delete public:resume:undefined
      const deleteCallArgs = mockCacheService.delete.mock.calls.map(
        (c) => c[0],
      );
      expect(deleteCallArgs.some((arg) => arg.includes('undefined'))).toBe(
        false,
      );
    });

    it('should not fail if cache operations fail', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Redis error'));
      mockCacheService.deletePattern.mockRejectedValue(
        new Error('Pattern error'),
      );

      // Should not throw - errors are caught and logged
      const result = await service.invalidateResume({
        resumeId: 'res-123',
        userId: 'user-456',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate all user-related cache keys', async () => {
      const userId = 'user-789';

      await service.invalidateUser(userId);

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:${userId}:profile`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:${userId}:preferences`,
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `user:${userId}:*`,
      );
    });
  });

  describe('invalidateAnalytics', () => {
    it('should invalidate analytics cache for entity', async () => {
      const entityId = 'entity-123';
      const entityType = 'resume';

      await service.invalidateAnalytics(entityType, entityId);

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        `analytics:${entityType}:${entityId}:*`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `analytics:dashboard:${entityId}`,
      );
    });
  });

  describe('invalidatePublicResumes', () => {
    it('should invalidate public resume listings cache', async () => {
      await service.invalidatePublicResumes();

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'public:resumes:*',
      );
    });
  });

  describe('invalidateAll', () => {
    it('should flush entire cache when called', async () => {
      await service.invalidateAll();

      expect(mockCacheService.flush).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('invalidateKeys', () => {
    it('should invalidate specific keys provided', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await service.invalidateKeys(keys);

      expect(mockCacheService.delete).toHaveBeenCalledTimes(3);
      expect(mockCacheService.delete).toHaveBeenCalledWith('key1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('key2');
      expect(mockCacheService.delete).toHaveBeenCalledWith('key3');
    });

    it('should handle empty keys array', async () => {
      await service.invalidateKeys([]);

      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('invalidatePatterns', () => {
    it('should invalidate patterns provided', async () => {
      const patterns = ['user:*:profile', 'analytics:*'];

      await service.invalidatePatterns(patterns);

      expect(mockCacheService.deletePattern).toHaveBeenCalledTimes(2);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'user:*:profile',
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'analytics:*',
      );
    });
  });
});
