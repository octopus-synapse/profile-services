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
import { SocialRepository } from '../repositories/social.repository';
import { FollowService } from './follow.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ActivityType } from '@prisma/client';

describe('ActivityService', () => {
  let service: ActivityService;
  let repository: SocialRepository;
  let followService: FollowService;
  let logger: AppLoggerService;

  beforeEach(async () => {
    const mockCreateActivity = mock();
    const mockFindManyActivities = mock();
    const mockCountActivities = mock();
    const mockGetFollowingIds = mock();
    const mockLog = mock();

    repository = {
      createActivity: mockCreateActivity,
      findActivitiesWithPagination: mockFindManyActivities,
      countActivities: mockCountActivities,
    } as SocialRepository;

    followService = {
      getFollowingIds: mockGetFollowingIds,
    } as FollowService;

    logger = {
      log: mockLog,
      error: mock(),
      warn: mock(),
      debug: mock(),
    } as AppLoggerService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: SocialRepository, useValue: repository },
        { provide: FollowService, useValue: followService },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('createActivity', () => {
    it('should create an activity record', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;
      const metadata = { resumeId: 'res-1', title: 'My Resume' };

      (repository.createActivity as ReturnType<typeof mock>).mockResolvedValue({
        id: 'activity-1',
        userId,
        type,
        metadata,
        createdAt: new Date(),
      });

      const result = await service.createActivity(userId, type, metadata);

      expect(result).toHaveProperty('id', 'activity-1');
      expect(repository.createActivity).toHaveBeenCalledWith({
        userId,
        type,
        metadata,
        entityId: undefined,
        entityType: undefined,
      });
    });

    it('should create activity with entityId and entityType', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_UPDATED;
      const metadata = { changes: ['title'] };
      const entityId = 'res-123';
      const entityType = 'resume';

      (repository.createActivity as ReturnType<typeof mock>).mockResolvedValue({
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

      expect(result.entityId).toBe(entityId);
      expect(result.entityType).toBe(entityType);
      expect(repository.createActivity).toHaveBeenCalledWith({
        userId,
        type,
        metadata,
        entityId,
        entityType,
      });
    });
  });

  describe('getActivityFeed', () => {
    it('should return activities from followed users', async () => {
      const userId = 'user-1';
      const followingIds = ['user-2', 'user-3'];
      const mockActivities = [
        {
          id: 'activity-1',
          userId: 'user-2',
          type: ActivityType.RESUME_CREATED,
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'activity-2',
          userId: 'user-3',
          type: ActivityType.RESUME_UPDATED,
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (
        followService.getFollowingIds as ReturnType<typeof mock>
      ).mockResolvedValue(followingIds);
      (
        repository.findActivitiesWithPagination as ReturnType<typeof mock>
      ).mockResolvedValue(mockActivities);
      (repository.countActivities as ReturnType<typeof mock>).mockResolvedValue(
        2,
      );

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty feed when user follows no one', async () => {
      const userId = 'user-1';

      (
        followService.getFollowingIds as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (
        repository.findActivitiesWithPagination as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (repository.countActivities as ReturnType<typeof mock>).mockResolvedValue(
        0,
      );

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should paginate activities correctly', async () => {
      const userId = 'user-1';
      const followingIds = ['user-2'];

      (
        followService.getFollowingIds as ReturnType<typeof mock>
      ).mockResolvedValue(followingIds);
      (
        repository.findActivitiesWithPagination as ReturnType<typeof mock>
      ).mockResolvedValue([]);
      (repository.countActivities as ReturnType<typeof mock>).mockResolvedValue(
        25,
      );

      const result = await service.getFeed(userId, {
        page: 2,
        limit: 10,
      });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('getUserActivities', () => {
    it('should return activities for a specific user', async () => {
      const userId = 'user-1';
      const mockActivities = [
        {
          id: 'activity-1',
          userId,
          type: ActivityType.RESUME_CREATED,
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (
        repository.findActivitiesWithPagination as ReturnType<typeof mock>
      ).mockResolvedValue(mockActivities);
      (repository.countActivities as ReturnType<typeof mock>).mockResolvedValue(
        1,
      );

      const result = await service.getUserActivities(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(userId);
    });
  });
});
