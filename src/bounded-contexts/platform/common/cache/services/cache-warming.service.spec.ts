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

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '../../logger/logger.service';
import { CacheService } from '../cache.service';
import { CacheWarmingService } from './cache-warming.service';

// --- Factory Functions for Mocks ---

interface MockResume {
  id: string;
  slug: string;
  title?: string;
  profileViews: number;
}

interface MockUser {
  id: string;
  name: string;
  preferences?: { theme?: string };
}

const createMockCacheService = (options?: { shouldFail?: boolean }) => ({
  get: mock(() => Promise.resolve(null)),
  set: options?.shouldFail
    ? mock(() => Promise.reject(new Error('Cache write failed')))
    : mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  deletePattern: mock(() => Promise.resolve()),
  isEnabled: true,
});

const createMockPrismaService = (options?: {
  resumes?: MockResume[];
  users?: MockUser[];
  shouldFail?: boolean;
}) => ({
  resume: {
    findMany: options?.shouldFail
      ? mock(() => Promise.reject(new Error('DB connection failed')))
      : mock(() => Promise.resolve(options?.resumes ?? [])),
    findUnique: mock((args: { where: { slug: string } }) => {
      const resume = options?.resumes?.find((r) => r.slug === args.where.slug);
      return Promise.resolve(resume ?? null);
    }),
  },
  user: {
    findMany: mock(() => Promise.resolve(options?.users ?? [])),
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
      const popularResumes: MockResume[] = [
        {
          id: 'res-1',
          slug: 'popular-1',
          title: 'Resume 1',
          profileViews: 100,
        },
        { id: 'res-2', slug: 'popular-2', title: 'Resume 2', profileViews: 80 },
      ];

      // Rebuild module with seeded data
      const prismaWithData = createMockPrismaService({
        resumes: popularResumes,
      });
      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: PrismaService, useValue: prismaWithData },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const serviceWithData = module.get<CacheWarmingService>(CacheWarmingService);
      await serviceWithData.warmPopularResumes(2);

      expect(prismaWithData.resume.findMany).toHaveBeenCalledWith(
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
      await service.warmPopularResumes();

      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should log success message', async () => {
      const resumeData: MockResume[] = [{ id: 'res-1', slug: 'test', profileViews: 10 }];
      const prismaWithData = createMockPrismaService({ resumes: resumeData });

      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: PrismaService, useValue: prismaWithData },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const serviceWithData = module.get<CacheWarmingService>(CacheWarmingService);
      await serviceWithData.warmPopularResumes(1);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warmed 1 popular resumes'),
        'CacheWarmingService',
      );
    });

    it('should not fail on database error', async () => {
      const failingPrisma = createMockPrismaService({ shouldFail: true });

      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: PrismaService, useValue: failingPrisma },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const failingService = module.get<CacheWarmingService>(CacheWarmingService);
      const result = await failingService.warmPopularResumes();

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not fail on cache error', async () => {
      const resumeData: MockResume[] = [{ id: 'res-1', slug: 'test', profileViews: 10 }];
      const prismaWithData = createMockPrismaService({ resumes: resumeData });
      const failingCache = createMockCacheService({ shouldFail: true });

      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: failingCache },
          { provide: PrismaService, useValue: prismaWithData },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const failingService = module.get<CacheWarmingService>(CacheWarmingService);
      const result = await failingService.warmPopularResumes(1);

      expect(result).toBeUndefined();
    });
  });

  describe('warmResumeBySlug', () => {
    it('should fetch and cache specific resume by slug', async () => {
      const resume: MockResume = {
        id: 'res-1',
        slug: 'my-resume',
        title: 'My Resume',
        profileViews: 50,
      };
      const prismaWithData = createMockPrismaService({ resumes: [resume] });

      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: PrismaService, useValue: prismaWithData },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const serviceWithData = module.get<CacheWarmingService>(CacheWarmingService);
      await serviceWithData.warmResumeBySlug('my-resume');

      expect(prismaWithData.resume.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'my-resume', isPublic: true },
        }),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith('public:resume:my-resume', resume, 300);
    });

    it('should not cache if resume not found', async () => {
      await service.warmResumeBySlug('nonexistent');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('warmUserProfile', () => {
    it('should warm user profile and preferences cache', async () => {
      const userId = 'user-123';
      const userData: MockUser = {
        id: userId,
        name: 'Test User',
        preferences: { theme: 'dark' },
      };
      const prismaWithData = createMockPrismaService({ users: [userData] });

      const module = await Test.createTestingModule({
        providers: [
          CacheWarmingService,
          { provide: CacheService, useValue: mockCacheService },
          { provide: PrismaService, useValue: prismaWithData },
          { provide: AppLoggerService, useValue: mockLogger },
        ],
      }).compile();

      const serviceWithData = module.get<CacheWarmingService>(CacheWarmingService);
      await serviceWithData.warmUserProfile(userId);

      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('warmAll', () => {
    it('should warm all cache categories', async () => {
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
