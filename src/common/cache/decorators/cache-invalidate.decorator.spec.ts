/**
 * @CacheInvalidate Decorator Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "First make it work, then make it right."
 *
 * Key scenarios:
 * - Invalidate single key after method execution
 * - Invalidate multiple keys
 * - Invalidate pattern (wildcard)
 * - Key interpolation with method arguments
 * - Choose invalidation timing (before or after)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { CacheInvalidate } from './cache-invalidate.decorator';
import { CacheService } from '../cache.service';

// --- Mock CacheService ---

const createMockCacheService = () => ({
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  deletePattern: mock(() => Promise.resolve()),
  isEnabled: true,
});

// --- Test Service with @CacheInvalidate ---

@Injectable()
class TestService {
  callCount = 0;
  cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  @CacheInvalidate({ keys: ['user:profile:cache'] })
  async updateStaticData(): Promise<string> {
    this.callCount++;
    return 'updated';
  }

  @CacheInvalidate({ keys: ['user:{0}:profile'] })
  async updateUserProfile(userId: string): Promise<{ id: string }> {
    this.callCount++;
    return { id: userId };
  }

  @CacheInvalidate({
    keys: ['resume:{0}', 'user:{0}:resumes', 'public:resume:{1}'],
  })
  async updateResume(
    resumeId: string,
    slug: string,
  ): Promise<{ id: string; slug: string }> {
    this.callCount++;
    return { id: resumeId, slug };
  }

  @CacheInvalidate({ patterns: ['analytics:*:{0}'] })
  async clearAnalytics(_userId: string): Promise<void> {
    this.callCount++;
  }

  @CacheInvalidate({ keys: ['config:cache'], timing: 'before' })
  async invalidateBeforeExecution(): Promise<string> {
    this.callCount++;
    return 'executed';
  }

  @CacheInvalidate({
    keys: ['user:{0}:data'],
    patterns: ['user:{0}:analytics:*'],
  })
  async clearUserData(_userId: string): Promise<void> {
    this.callCount++;
  }
}

describe('@CacheInvalidate decorator', () => {
  let service: TestService;
  let mockCacheService: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    mockCacheService = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<TestService>(TestService);
    service.cacheService = mockCacheService as unknown as CacheService;
    service.callCount = 0;
  });

  describe('single key invalidation', () => {
    it('should invalidate single static key after method execution', async () => {
      const result = await service.updateStaticData();

      expect(result).toBe('updated');
      expect(service.callCount).toBe(1);
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'user:profile:cache',
      );
    });

    it('should interpolate key with method arguments', async () => {
      const result = await service.updateUserProfile('user-123');

      expect(result).toEqual({ id: 'user-123' });
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'user:user-123:profile',
      );
    });
  });

  describe('multiple keys invalidation', () => {
    it('should invalidate multiple keys with interpolation', async () => {
      const result = await service.updateResume('res-456', 'my-resume');

      expect(result).toEqual({ id: 'res-456', slug: 'my-resume' });
      expect(mockCacheService.delete).toHaveBeenCalledTimes(3);
      expect(mockCacheService.delete).toHaveBeenCalledWith('resume:res-456');
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'user:res-456:resumes',
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'public:resume:my-resume',
      );
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate pattern with interpolation', async () => {
      await service.clearAnalytics('user-789');

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'analytics:*:user-789',
      );
    });

    it('should handle both keys and patterns', async () => {
      await service.clearUserData('user-abc');

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'user:user-abc:data',
      );
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(
        'user:user-abc:analytics:*',
      );
    });
  });

  describe('timing option', () => {
    it('should invalidate before method execution when timing is "before"', async () => {
      const callOrder: string[] = [];

      mockCacheService.delete.mockImplementation(async () => {
        callOrder.push('cache-delete');
      });

      const originalCallCount = service.callCount;

      const result = await service.invalidateBeforeExecution();

      // Verify delete was called
      expect(mockCacheService.delete).toHaveBeenCalledWith('config:cache');
      expect(result).toBe('executed');
      expect(service.callCount).toBe(originalCallCount + 1);
    });
  });

  describe('error handling', () => {
    it('should not fail method if cache invalidation fails', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.updateStaticData();

      expect(result).toBe('updated');
      expect(service.callCount).toBe(1);
    });

    it('should not fail method if pattern invalidation fails', async () => {
      mockCacheService.deletePattern.mockRejectedValue(
        new Error('Redis pattern failed'),
      );

      await service.clearAnalytics('user-123');

      expect(service.callCount).toBe(1);
    });
  });
});
