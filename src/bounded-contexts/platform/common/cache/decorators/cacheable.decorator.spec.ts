/**
 * @Cacheable Decorator Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Write failing tests first. The test describes what you want."
 *
 * Key scenarios:
 * - Cache hit returns cached value without calling method
 * - Cache miss calls method and stores result
 * - TTL is respected
 * - Key interpolation with method arguments
 * - Works with async methods
 * - Handles cache failures gracefully (falls back to method call)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { Cacheable, buildCacheKey } from './cacheable.decorator';
import { CacheService } from '../cache.service';

// --- Mock CacheService ---

const createMockCacheService = () => ({
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  isEnabled: true,
});

// --- Test Service with @Cacheable ---

@Injectable()
class TestService {
  callCount = 0;
  cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  @Cacheable({ key: 'test:static', ttl: 60 })
  async getStaticData(): Promise<string> {
    this.callCount++;
    return 'computed-value';
  }

  @Cacheable({ key: 'user:{0}:profile', ttl: 120 })
  async getUserProfile(userId: string): Promise<{ id: string; name: string }> {
    this.callCount++;
    return { id: userId, name: `User ${userId}` };
  }

  @Cacheable({ key: 'resume:{slug}', ttl: 300 })
  async getResumeBySlug(
    slug: string,
  ): Promise<{ slug: string; title: string }> {
    this.callCount++;
    return { slug, title: `Resume ${slug}` };
  }

  @Cacheable({ key: 'analytics:{userId}:{period}', ttl: 3600 })
  async getAnalytics(
    _userId: string,
    _period: string,
  ): Promise<{ views: number }> {
    this.callCount++;
    return { views: 100 };
  }

  @Cacheable({ key: 'object:{data.id}', ttl: 60 })
  async processObject(data: { id: string; value: number }): Promise<number> {
    this.callCount++;
    return data.value * 2;
  }
}

describe('buildCacheKey', () => {
  it('should return static key unchanged', () => {
    const key = buildCacheKey('test:static', []);
    expect(key).toBe('test:static');
  });

  it('should interpolate positional arguments with {0}, {1}', () => {
    const key = buildCacheKey('user:{0}:profile', ['user-123']);
    expect(key).toBe('user:user-123:profile');
  });

  it('should interpolate multiple positional arguments', () => {
    const key = buildCacheKey('analytics:{0}:{1}', ['user-123', 'weekly']);
    expect(key).toBe('analytics:user-123:weekly');
  });

  it('should interpolate named parameters from objects', () => {
    const key = buildCacheKey('resume:{slug}', ['my-resume']);
    expect(key).toBe('resume:my-resume');
  });

  it('should interpolate nested object properties', () => {
    const key = buildCacheKey('object:{data.id}', [
      { id: 'obj-123', value: 42 },
    ]);
    expect(key).toBe('object:obj-123');
  });

  it('should handle undefined values gracefully', () => {
    const key = buildCacheKey('user:{0}:profile', [undefined]);
    expect(key).toBe('user:undefined:profile');
  });
});

describe('@Cacheable decorator', () => {
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

  describe('cache miss', () => {
    it('should call method and cache result on cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getStaticData();

      expect(result).toBe('computed-value');
      expect(service.callCount).toBe(1);
      expect(mockCacheService.get).toHaveBeenCalledWith('test:static');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test:static',
        'computed-value',
        60,
      );
    });

    it('should use interpolated key for cache operations', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUserProfile('user-456');

      expect(result).toEqual({ id: 'user-456', name: 'User user-456' });
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'user:user-456:profile',
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'user:user-456:profile',
        { id: 'user-456', name: 'User user-456' },
        120,
      );
    });
  });

  describe('cache hit', () => {
    it('should return cached value without calling method', async () => {
      mockCacheService.get.mockResolvedValue('cached-value');

      const result = await service.getStaticData();

      expect(result).toBe('cached-value');
      expect(service.callCount).toBe(0);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should return cached object value', async () => {
      const cachedProfile = { id: 'user-123', name: 'Cached User' };
      mockCacheService.get.mockResolvedValue(cachedProfile);

      const result = await service.getUserProfile('user-123');

      expect(result).toEqual(cachedProfile);
      expect(service.callCount).toBe(0);
    });
  });

  describe('multiple arguments', () => {
    it('should build key with multiple arguments', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await service.getAnalytics('user-789', 'monthly');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'analytics:user-789:monthly',
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'analytics:user-789:monthly',
        { views: 100 },
        3600,
      );
    });
  });

  describe('error handling', () => {
    it('should call method if cache get fails', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.getStaticData();

      expect(result).toBe('computed-value');
      expect(service.callCount).toBe(1);
    });

    it('should not fail if cache set fails after method call', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockRejectedValue(new Error('Redis write failed'));

      const result = await service.getStaticData();

      expect(result).toBe('computed-value');
      expect(service.callCount).toBe(1);
    });
  });
});
