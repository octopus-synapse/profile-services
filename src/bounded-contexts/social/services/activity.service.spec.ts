/**
 * ActivityService Tests
 *
 * Clean architecture: Stub dependencies, Pure Bun tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ActivityType } from '../application/ports/activity.port';
import { ActivityService } from './activity.service';

/**
 * Activity record with user information
 */
interface ActivityRecord {
  id: string;
  userId: string;
  type: ActivityType;
  metadata?: unknown;
  entityId?: string | null;
  entityType?: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
}

/**
 * Create a default activity record for testing
 */
function createActivityRecord(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  return {
    id: 'activity-1',
    userId: 'user-1',
    type: ActivityType.RESUME_CREATED,
    metadata: {},
    entityId: null,
    entityType: null,
    createdAt: new Date(),
    user: {
      id: 'user-1',
      name: 'Test User',
      username: 'testuser',
      photoURL: null,
    },
    ...overrides,
  };
}

/**
 * Stub Prisma Service for testing
 */
class StubPrismaService {
  private createResult: ActivityRecord = createActivityRecord();
  private findManyResult: ActivityRecord[] = [];
  private findUniqueResult: ActivityRecord | null = createActivityRecord();
  private countResult = 0;
  private deleteManyResult = { count: 0 };

  calls: Array<{ method: string; args: unknown[] }> = [];

  activity = {
    create: async (args: unknown): Promise<ActivityRecord> => {
      this.calls.push({ method: 'activity.create', args: [args] });
      return this.createResult;
    },
    findMany: async (args: unknown): Promise<ActivityRecord[]> => {
      this.calls.push({ method: 'activity.findMany', args: [args] });
      return this.findManyResult;
    },
    findUnique: async (args: unknown): Promise<ActivityRecord | null> => {
      this.calls.push({ method: 'activity.findUnique', args: [args] });
      return this.findUniqueResult;
    },
    count: async (args: unknown): Promise<number> => {
      this.calls.push({ method: 'activity.count', args: [args] });
      return this.countResult;
    },
    deleteMany: async (args: unknown): Promise<{ count: number }> => {
      this.calls.push({ method: 'activity.deleteMany', args: [args] });
      return this.deleteManyResult;
    },
  };

  follow = {
    findMany: async (): Promise<unknown[]> => [],
  };

  setCreateResult(result: ActivityRecord): void {
    this.createResult = result;
  }

  setFindManyResult(result: ActivityRecord[]): void {
    this.findManyResult = result;
  }

  setCountResult(result: number): void {
    this.countResult = result;
  }

  setDeleteManyResult(count: number): void {
    this.deleteManyResult = { count };
  }

  getCallsFor(method: string): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }
}

/**
 * Stub FollowService for testing
 */
class StubFollowService {
  private followingIdsResult: string[] = ['user-2', 'user-3'];

  calls: Array<{ method: string; args: unknown[] }> = [];

  setFollowingIdsResult(ids: string[]): void {
    this.followingIdsResult = ids;
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    this.calls.push({ method: 'getFollowingIds', args: [userId] });
    return this.followingIdsResult;
  }
}

/**
 * Stub Logger
 */
const stubLogger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

/**
 * Stub Event Publisher
 */
const stubEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

/**
 * Stub Event Emitter
 */
const stubEventEmitter = {
  emit: () => true,
  emitAsync: () => Promise.resolve([]),
};

describe('ActivityService', () => {
  let service: ActivityService;
  let stubPrisma: StubPrismaService;
  let stubFollowService: StubFollowService;

  beforeEach(() => {
    stubPrisma = new StubPrismaService();
    stubFollowService = new StubFollowService();

    service = new ActivityService(
      stubPrisma as never,
      stubFollowService as never,
      stubLogger as never,
      stubEventPublisher as never,
      stubEventEmitter as never,
    );
  });

  describe('createActivity', () => {
    it('should create an activity record', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;
      const metadata = { resumeId: 'res-1', title: 'My Resume' };

      stubPrisma.setCreateResult(createActivityRecord({ userId, type, metadata }));

      const result = await service.createActivity(userId, type, metadata);

      expect(result).toHaveProperty('id', 'activity-1');
      expect(stubPrisma.getCallsFor('activity.create').length).toBe(1);
    });

    it('should create activity with entityId and entityType', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_UPDATED;
      const metadata = { changes: ['title'] };
      const entityId = 'res-123';
      const entityType = 'resume';

      stubPrisma.setCreateResult(
        createActivityRecord({
          id: 'activity-2',
          userId,
          type,
          metadata,
          entityId,
          entityType,
        }),
      );

      const result = await service.createActivity(userId, type, metadata, entityId, entityType);

      expect(result).toHaveProperty('id', 'activity-2');
      expect(stubPrisma.getCallsFor('activity.create').length).toBeGreaterThan(0);
    });
  });

  describe('getFeed', () => {
    it('should return activities from followed users', async () => {
      const userId = 'user-1';
      const activities: ActivityRecord[] = [
        createActivityRecord({
          id: 'activity-1',
          userId: 'user-2',
          type: ActivityType.RESUME_CREATED,
        }),
        createActivityRecord({
          id: 'activity-2',
          userId: 'user-3',
          type: ActivityType.SKILL_ADDED,
        }),
      ];

      stubFollowService.setFollowingIdsResult(['user-2', 'user-3']);
      stubPrisma.setFindManyResult(activities);
      stubPrisma.setCountResult(2);

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(
        stubFollowService.calls.filter((c) => c.method === 'getFollowingIds').length,
      ).toBeGreaterThan(0);
      expect(stubPrisma.getCallsFor('activity.findMany').length).toBeGreaterThan(0);
    });

    it('should return empty feed when not following anyone', async () => {
      const userId = 'user-1';

      stubFollowService.setFollowingIdsResult([]);
      stubPrisma.setCountResult(0);

      const result = await service.getFeed(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserActivities', () => {
    it('should return activities for a specific user', async () => {
      const userId = 'user-1';
      const activities: ActivityRecord[] = [
        createActivityRecord({
          userId,
          type: ActivityType.RESUME_CREATED,
        }),
      ];

      stubPrisma.setFindManyResult(activities);
      stubPrisma.setCountResult(1);

      const result = await service.getUserActivities(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(stubPrisma.getCallsFor('activity.findMany').length).toBeGreaterThan(0);
    });
  });

  describe('getActivitiesByType', () => {
    it('should filter activities by type', async () => {
      const userId = 'user-1';
      const type = ActivityType.RESUME_CREATED;

      stubPrisma.setFindManyResult([]);
      stubPrisma.setCountResult(0);

      await service.getActivitiesByType(userId, type, { page: 1, limit: 10 });

      expect(stubPrisma.getCallsFor('activity.findMany').length).toBeGreaterThan(0);
    });
  });

  describe('deleteOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      stubPrisma.setDeleteManyResult(5);

      await service.deleteOldActivities(30);

      expect(stubPrisma.getCallsFor('activity.deleteMany').length).toBeGreaterThan(0);
    });
  });
});
