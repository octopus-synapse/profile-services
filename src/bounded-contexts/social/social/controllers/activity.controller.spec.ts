/**
 * ActivityController Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from '../services/activity.service';

// --- Mocks ---

const createMockActivityService = () => ({
  getFeed: mock(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
  ),
  getUserActivities: mock(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
  ),
  getActivitiesByType: mock(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
  ),
});

describe('ActivityController', () => {
  let controller: ActivityController;
  let mockActivityService: ReturnType<typeof createMockActivityService>;

  beforeEach(async () => {
    mockActivityService = createMockActivityService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: mockActivityService }],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  describe('GET /users/:userId/feed', () => {
    it('should return paginated activity feed', async () => {
      const userId = 'user-1';
      const mockFeed = {
        data: [
          {
            id: 'activity-1',
            type: 'FOLLOWED_USER',
            userId: 'user-2',
            targetId: userId,
            metadata: {},
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockActivityService.getFeed.mockResolvedValue(mockFeed);

      const result = await controller.getFeed({ userId } as any, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeed);
      expect(mockActivityService.getFeed).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
      });
    });

    it('should cap limit at 100', async () => {
      const userId = 'user-1';

      await controller.getFeed({ userId } as any, 1, 200);

      expect(mockActivityService.getFeed).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 100,
      });
    });
  });

  describe('GET /users/:userId/activities', () => {
    it('should return paginated user activities', async () => {
      const userId = 'user-1';
      const mockActivities = {
        data: [
          {
            id: 'activity-1',
            type: 'UPDATED_RESUME',
            userId,
            targetId: 'resume-1',
            metadata: { title: 'My Resume' },
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockActivityService.getUserActivities.mockResolvedValue(mockActivities);

      const result = await controller.getUserActivities(userId, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActivities);
      expect(mockActivityService.getUserActivities).toHaveBeenCalledWith(
        userId,
        { page: 1, limit: 20 },
      );
    });
  });

  describe('GET /users/:userId/activities/by-type/:type', () => {
    it('should return activities filtered by type', async () => {
      const userId = 'user-1';
      const type = 'FOLLOWED_USER';
      const mockActivities = {
        data: [
          {
            id: 'activity-1',
            type,
            userId,
            targetId: 'user-2',
            metadata: { userName: 'John' },
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockActivityService.getActivitiesByType.mockResolvedValue(mockActivities);

      const result = await controller.getActivitiesByType(userId, type, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActivities);
      expect(mockActivityService.getActivitiesByType).toHaveBeenCalledWith(
        userId,
        type,
        { page: 1, limit: 20 },
      );
    });
  });
});
