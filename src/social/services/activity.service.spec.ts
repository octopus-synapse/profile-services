/**
 * ActivityService Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Test observable behavior."
 *
 * Key scenarios:
 * - Create activity
 * - Get user's activity feed (from followed users)
 * - Get user's own activities
 * - Activity pagination
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { FollowService } from './follow.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ActivityType } from '@prisma/client';

// --- Mocks ---

const createMockPrismaService = () => ({
  activity: {
    create: mock(() => Promise.resolve({ id: 'activity-1' })),
    findMany: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
  },
});

const createMockFollowService = () => ({
  getFollowingIds: mock(() => Promise.resolve(['user-2', 'user-3'])),
});

const createMockLogger = () => ({
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

describe('ActivityService', () => {
  let service: ActivityService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockFollowService: ReturnType<typeof createMockFollowService>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();
    mockFollowService = createMockFollowService();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FollowService, useValue: mockFollowService },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('createActivity', () => {
    it('should create an activity record', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;
      const metadata = { resumeId: 'res-1', title: 'My Resume' };

      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        userId,
        type,
        metadata,
        createdAt: new Date(),
      });

      const result = await service.createActivity(userId, type, metadata);

      expect(result).toHaveProperty('id', 'activity-1');
      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          metadata,
          entityId: undefined,
          entityType: undefined,
        },
      });
    });

    it('should create activity with entityId and entityType', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_UPDATED;
      const metadata = { changes: ['title'] };
      const entityId = 'res-123';
      const entityType = 'resume';

      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-2',
        userId,
        type,
        metadata,
        entityId,
        entityType,
        createdAt: new Date(),
      });

      const result = await service.createActivity(
        userId,
        type,
        metadata,
        entityId,
        entityType,
      );

      expect(result).toHaveProperty('id', 'activity-2');
      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          metadata,
          entityId,
          entityType,
        },
      });
    });
  });

  describe('getFeed', () => {
    it('should return activities from followed users', async () => {
      const userId = 'user-1';
      const activities = [
        {
          id: 'activity-1',
          userId: 'user-2',
          type: ActivityType.RESUME_CREATED,
          createdAt: new Date(),
          user: { id: 'user-2', name: 'User 2' },
        },
        {
          id: 'activity-2',
          userId: 'user-3',
          type: ActivityType.SKILL_ADDED,
          createdAt: new Date(),
          user: { id: 'user-3', name: 'User 3' },
        },
      ];

      mockFollowService.getFollowingIds.mockResolvedValue(['user-2', 'user-3']);
      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.activity.count.mockResolvedValue(2);

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFollowService.getFollowingIds).toHaveBeenCalledWith(userId);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: { in: ['user-2', 'user-3'] } },
        }),
      );
    });

    it('should return empty feed when not following anyone', async () => {
      const userId = 'user-1';

      mockFollowService.getFollowingIds.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserActivities', () => {
    it('should return activities for a specific user', async () => {
      const userId = 'user-1';
      const activities = [
        {
          id: 'activity-1',
          userId,
          type: ActivityType.RESUME_CREATED,
          createdAt: new Date(),
        },
      ];

      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.activity.count.mockResolvedValue(1);

      const result = await service.getUserActivities(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
    });
  });

  describe('getActivitiesByType', () => {
    it('should filter activities by type', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;

      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await service.getActivitiesByType(userId, type, { page: 1, limit: 10 });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, type },
        }),
      );
    });
  });

  describe('deleteOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      const deleteMany = mock(() => Promise.resolve({ count: 5 }));
      (mockPrisma as any).activity.deleteMany = deleteMany;

      await service.deleteOldActivities(30);

      expect(deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              lt: expect.any(Date),
            },
          },
        }),
      );
    });
  });
});
