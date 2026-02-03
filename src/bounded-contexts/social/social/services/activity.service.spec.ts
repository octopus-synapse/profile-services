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
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityType } from '@prisma/client';

// --- Mocks ---

const createMockPrismaService = () => ({
  activity: {
    create: mock(() => Promise.resolve({ id: 'activity-1' })),
    findMany: mock(() => Promise.resolve([])),
    findUnique: mock(() =>
      Promise.resolve({
        id: 'activity-1',
        userId: 'user-1',
        type: 'RESUME_CREATED',
        metadata: {},
        createdAt: new Date(),
        user: { id: 'user-1', name: 'Test User', username: 'testuser', displayName: 'Test', photoURL: null },
      }),
    ),
    count: mock(() => Promise.resolve(0)),
    deleteMany: mock(() => Promise.resolve({ count: 0 })),
  },
  follow: {
    findMany: mock(() => Promise.resolve([])),
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

const createMockEventPublisher = () => ({
  publish: mock(),
  publishAsync: mock(() => Promise.resolve()),
});

const createMockEventEmitter = () => ({
  emit: mock(() => true),
  emitAsync: mock(() => Promise.resolve([])),
});

describe('ActivityService', () => {
  let service: ActivityService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockFollowService: ReturnType<typeof createMockFollowService>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockEventPublisher: ReturnType<typeof createMockEventPublisher>;
  let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();
    mockFollowService = createMockFollowService();
    mockLogger = createMockLogger();
    mockEventPublisher = createMockEventPublisher();
    mockEventEmitter = createMockEventEmitter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FollowService, useValue: mockFollowService },
        { provide: AppLoggerService, useValue: mockLogger },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('createActivity', () => {
    it('should create an activity record', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;
      const metadata = { resumeId: 'res-1', title: 'My Resume' };

      mockPrisma.activity.create.mockImplementation(() =>
        Promise.resolve({
          id: 'activity-1',
          userId,
          type,
          metadata,
          createdAt: new Date(),
        }),
      );

      const result = await service.createActivity(userId, type, metadata);

      expect(result).toHaveProperty('id', 'activity-1');
      expect(mockPrisma.activity.create.mock.calls.length).toBe(1);
    });

    it('should create activity with entityId and entityType', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_UPDATED;
      const metadata = { changes: ['title'] };
      const entityId = 'res-123';
      const entityType = 'resume';

      mockPrisma.activity.create.mockImplementation(() =>
        Promise.resolve({
          id: 'activity-2',
          userId,
          type,
          metadata,
          entityId,
          entityType,
          createdAt: new Date(),
        }),
      );

      const result = await service.createActivity(
        userId,
        type,
        metadata,
        entityId,
        entityType,
      );

      expect(result).toHaveProperty('id', 'activity-2');
      expect(mockPrisma.activity.create.mock.calls.length).toBeGreaterThan(0);
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

      mockFollowService.getFollowingIds.mockImplementation(() =>
        Promise.resolve(['user-2', 'user-3']),
      );
      mockPrisma.activity.findMany.mockImplementation(() =>
        Promise.resolve(activities),
      );
      mockPrisma.activity.count.mockImplementation(() => Promise.resolve(2));

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFollowService.getFollowingIds.mock.calls.length).toBeGreaterThan(0);
      expect(mockPrisma.activity.findMany.mock.calls.length).toBeGreaterThan(0);
    });

    it('should return empty feed when not following anyone', async () => {
      const userId = 'user-1';

      mockFollowService.getFollowingIds.mockImplementation(() =>
        Promise.resolve([]),
      );
      mockPrisma.activity.count.mockImplementation(() => Promise.resolve(0));

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

      mockPrisma.activity.findMany.mockImplementation(() =>
        Promise.resolve(activities),
      );
      mockPrisma.activity.count.mockImplementation(() => Promise.resolve(1));

      const result = await service.getUserActivities(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.activity.findMany.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('getActivitiesByType', () => {
    it('should filter activities by type', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;

      mockPrisma.activity.findMany.mockImplementation(() =>
        Promise.resolve([]),
      );
      mockPrisma.activity.count.mockImplementation(() => Promise.resolve(0));

      await service.getActivitiesByType(userId, type, { page: 1, limit: 10 });

      expect(mockPrisma.activity.findMany.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('deleteOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      mockPrisma.activity.deleteMany.mockImplementation(() =>
        Promise.resolve({ count: 5 }),
      );

      await service.deleteOldActivities(30);

      expect(mockPrisma.activity.deleteMany.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
