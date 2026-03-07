/**
 * ActivityController Tests
 *
 * Clean architecture: Stub Service, Pure Bun tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { ActivityType } from '@prisma/client';
import { ActivityController } from './activity.controller';

/**
 * Paginated response type for activities
 */
interface PaginatedActivity {
  data: Activity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Activity {
  id: string;
  type: string;
  userId: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Stub ActivityService for testing
 */
class StubActivityService {
  private feedResult: PaginatedActivity = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
  private userActivitiesResult: PaginatedActivity = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
  private activitiesByTypeResult: PaginatedActivity = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  calls: Array<{ method: string; args: unknown[] }> = [];

  setFeedResult(result: PaginatedActivity): void {
    this.feedResult = result;
  }

  setUserActivitiesResult(result: PaginatedActivity): void {
    this.userActivitiesResult = result;
  }

  setActivitiesByTypeResult(result: PaginatedActivity): void {
    this.activitiesByTypeResult = result;
  }

  async getFeed(userId: string, options: PaginationOptions): Promise<PaginatedActivity> {
    this.calls.push({ method: 'getFeed', args: [userId, options] });
    return this.feedResult;
  }

  async getUserActivities(userId: string, options: PaginationOptions): Promise<PaginatedActivity> {
    this.calls.push({ method: 'getUserActivities', args: [userId, options] });
    return this.userActivitiesResult;
  }

  async getActivitiesByType(
    userId: string,
    type: ActivityType,
    options: PaginationOptions,
  ): Promise<PaginatedActivity> {
    this.calls.push({
      method: 'getActivitiesByType',
      args: [userId, type, options],
    });
    return this.activitiesByTypeResult;
  }

  getLastCall(method: string): { method: string; args: unknown[] } | undefined {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

describe('ActivityController', () => {
  let controller: ActivityController;
  let stubActivityService: StubActivityService;

  beforeEach(() => {
    stubActivityService = new StubActivityService();
    controller = new ActivityController(stubActivityService as never);
  });

  describe('GET /users/:userId/feed', () => {
    it('should return paginated activity feed', async () => {
      const userId = 'user-1';
      const mockFeed: PaginatedActivity = {
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

      stubActivityService.setFeedResult(mockFeed);

      const result = await controller.getFeed({ userId } as never, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ feed: mockFeed });

      const call = stubActivityService.getLastCall('getFeed');
      expect(call?.args[0]).toBe(userId);
      expect(call?.args[1]).toEqual({ page: 1, limit: 20 });
    });

    it('should cap limit at 100', async () => {
      const userId = 'user-1';

      await controller.getFeed({ userId } as never, 1, 200);

      const call = stubActivityService.getLastCall('getFeed');
      expect(call?.args[1]).toEqual({ page: 1, limit: 100 });
    });
  });

  describe('GET /users/:userId/activities', () => {
    it('should return paginated user activities', async () => {
      const userId = 'user-1';
      const mockActivities: PaginatedActivity = {
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

      stubActivityService.setUserActivitiesResult(mockActivities);

      const result = await controller.getUserActivities(userId, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ activities: mockActivities });

      const call = stubActivityService.getLastCall('getUserActivities');
      expect(call?.args[0]).toBe(userId);
      expect(call?.args[1]).toEqual({ page: 1, limit: 20 });
    });
  });

  describe('GET /users/:userId/activities/by-type/:type', () => {
    it('should return activities filtered by type', async () => {
      const userId = 'user-1';
      const type = 'FOLLOWED_USER';
      const mockActivities: PaginatedActivity = {
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

      stubActivityService.setActivitiesByTypeResult(mockActivities);

      const result = await controller.getActivitiesByType(userId, type, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ activities: mockActivities });

      const call = stubActivityService.getLastCall('getActivitiesByType');
      expect(call?.args[0]).toBe(userId);
      expect(call?.args[1]).toBe(type);
      expect(call?.args[2]).toEqual({ page: 1, limit: 20 });
    });
  });
});
