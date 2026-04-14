/**
 * ActivityController Tests — port-based stub.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { ActivityType, ActivityWithUser } from '../application/ports/activity.port';
import { ActivityReaderPort } from '../application/ports/facade.ports';
import type { PaginatedResult, PaginationParams } from '../application/ports/follow.port';
import { ActivityController } from './activity.controller';

const makeUser = (userId: string): UserPayload => ({
  userId,
  email: `${userId}@test.local`,
  hasCompletedOnboarding: true,
});

const emptyPage = <T>(pagination: PaginationParams): PaginatedResult<T> => ({
  data: [],
  total: 0,
  page: pagination.page,
  limit: pagination.limit,
  totalPages: 0,
});

class StubActivityReader extends ActivityReaderPort {
  private feedResult: PaginatedResult<ActivityWithUser> = emptyPage({ page: 1, limit: 20 });
  private userActivitiesResult: PaginatedResult<ActivityWithUser> = emptyPage({
    page: 1,
    limit: 20,
  });
  private activitiesByTypeResult: PaginatedResult<ActivityWithUser> = emptyPage({
    page: 1,
    limit: 20,
  });

  getFeed = mock(
    async (_userId: string, _pagination: PaginationParams): Promise<PaginatedResult<ActivityWithUser>> =>
      this.feedResult,
  );
  getUserActivities = mock(
    async (_userId: string, _pagination: PaginationParams): Promise<PaginatedResult<ActivityWithUser>> =>
      this.userActivitiesResult,
  );
  getActivitiesByType = mock(
    async (
      _userId: string,
      _type: ActivityType,
      _pagination: PaginationParams,
    ): Promise<PaginatedResult<ActivityWithUser>> => this.activitiesByTypeResult,
  );

  setFeedResult(result: PaginatedResult<ActivityWithUser>): void {
    this.feedResult = result;
  }

  setUserActivitiesResult(result: PaginatedResult<ActivityWithUser>): void {
    this.userActivitiesResult = result;
  }

  setActivitiesByTypeResult(result: PaginatedResult<ActivityWithUser>): void {
    this.activitiesByTypeResult = result;
  }
}

const makeActivity = (overrides: Partial<ActivityWithUser> = {}): ActivityWithUser => ({
  id: 'activity-1',
  userId: 'user-2',
  type: 'FOLLOWED_USER',
  metadata: {},
  entityId: null,
  entityType: null,
  createdAt: new Date(),
  ...overrides,
});

describe('ActivityController', () => {
  let controller: ActivityController;
  let stubActivityReader: StubActivityReader;

  beforeEach(() => {
    stubActivityReader = new StubActivityReader();
    controller = new ActivityController(stubActivityReader);
  });

  describe('GET /users/:userId/feed', () => {
    it('should return paginated activity feed', async () => {
      stubActivityReader.setFeedResult({
        data: [makeActivity()],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.getFeed(makeUser('user-1'), 1, 20);

      expect(result.success).toBe(true);
      expect(stubActivityReader.getFeed).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
    });

    it('should cap limit at 100', async () => {
      await controller.getFeed(makeUser('user-1'), 1, 200);

      expect(stubActivityReader.getFeed).toHaveBeenCalledWith('user-1', { page: 1, limit: 100 });
    });
  });

  describe('GET /users/:userId/activities', () => {
    it('should return paginated user activities', async () => {
      stubActivityReader.setUserActivitiesResult({
        data: [makeActivity({ userId: 'user-1' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.getUserActivities('user-1', 1, 20);

      expect(result.success).toBe(true);
      expect(stubActivityReader.getUserActivities).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('GET /users/:userId/activities/by-type/:type', () => {
    it('should return activities filtered by type', async () => {
      stubActivityReader.setActivitiesByTypeResult({
        data: [makeActivity({ userId: 'user-1' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.getActivitiesByType('user-1', 'FOLLOWED_USER', 1, 20);

      expect(result.success).toBe(true);
      expect(stubActivityReader.getActivitiesByType).toHaveBeenCalledWith(
        'user-1',
        'FOLLOWED_USER',
        { page: 1, limit: 20 },
      );
    });
  });
});
