/**
 * CacheWarmingService Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Tests describe what you want, not how you get it."
 *
 * This service pre-populates cache with frequently accessed data
 * to improve performance for common queries.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheWarmingService } from './cache-warming.service';
import { CacheService } from '../cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '../../logger/logger.service';

// --- Mocks ---

const createMockCacheService = () => ({
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  deletePattern: mock(() => Promise.resolve()),
  isEnabled: true,
});

const createMockPrismaService = () => ({
  resume: {
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() => Promise.resolve(null)),
  },
  user: {
    findMany: mock(() => Promise.resolve([])),
  },
});

const createMockLogger = () => ({
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

describe('CacheWarmingService', () => {
  let service: CacheWarmingService;
  let mockCacheService: ReturnType<typeof createMockCacheService>;
  let mockPrismaService: ReturnType<typeof createMockPrismaService>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockCacheService = createMockCacheService();
    mockPrismaService = createMockPrismaService();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheWarmingService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CacheWarmingService>(CacheWarmingService);
  });

  describe('warmPopularResumes', () => {
    it('should fetch and cache popular public resumes', async () => {
      const popularResumes = [
        {
          id: 'res-1',
          slug: 'popular-1',
          title: 'Resume 1',
          profileViews: 100,
        },
        { id: 'res-2', slug: 'popular-2', title: 'Resume 2', profileViews: 80 },
      ];
      mockPrismaService.resume.findMany.mockResolvedValue(popularResumes);

      await service.warmPopularResumes(2);

      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true },
          orderBy: { profileViews: 'desc' },
          take: 2,
        }),
      );
      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'public:resume:popular-1',
        popularResumes[0],
        3600,
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'public:resume:popular-2',
        popularResumes[1],
        3600,
      );
    });

    it('should use default limit when not provided', async () => {
      mockPrismaService.resume.findMany.mockResolvedValue([]);

      await service.warmPopularResumes();

      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should log success message', async () => {
      mockPrismaService.resume.findMany.mockResolvedValue([
        { id: 'res-1', slug: 'test', profileViews: 10 },
      ]);

      await service.warmPopularResumes(1);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warmed 1 popular resumes'),
        'CacheWarmingService',
      );
    });

    it('should not fail on database error', async () => {
      mockPrismaService.resume.findMany.mockRejectedValue(
        new Error('DB connection failed'),
      );

      const result = await service.warmPopularResumes();

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not fail on cache error', async () => {
      mockPrismaService.resume.findMany.mockResolvedValue([
        { id: 'res-1', slug: 'test', profileViews: 10 },
      ]);
      mockCacheService.set.mockRejectedValue(new Error('Cache write failed'));

      const result = await service.warmPopularResumes(1);

      expect(result).toBeUndefined();
    });
  });

  describe('warmResumeBySlug', () => {
    it('should fetch and cache specific resume by slug', async () => {
      const resume = { id: 'res-1', slug: 'my-resume', title: 'My Resume' };
      mockPrismaService.resume.findUnique.mockResolvedValue(resume);

      await service.warmResumeBySlug('my-resume');

      expect(mockPrismaService.resume.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'my-resume', isPublic: true },
        }),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'public:resume:my-resume',
        resume,
        300,
      );
    });

    it('should not cache if resume not found', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValue(null);

      await service.warmResumeBySlug('nonexistent');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('warmUserProfile', () => {
    it('should warm user profile and preferences cache', async () => {
      const userId = 'user-123';
      const userData = {
        id: userId,
        name: 'Test User',
        preferences: { theme: 'dark' },
      };
      // Mock user query through prisma - we'll implement this properly in the service
      mockPrismaService.user.findMany.mockResolvedValue([userData]);

      await service.warmUserProfile(userId);

      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('warmAll', () => {
    it('should warm all cache categories', async () => {
      mockPrismaService.resume.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.warmAll();

      expect(mockPrismaService.resume.findMany).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache warming completed'),
        'CacheWarmingService',
      );
    });
  });

  describe('getWarmingStats', () => {
    it('should return warming statistics', async () => {
      const stats = service.getWarmingStats();

      expect(stats).toHaveProperty('lastWarmTime');
      expect(stats).toHaveProperty('itemsWarmed');
      expect(stats).toHaveProperty('errors');
    });
  });
});
