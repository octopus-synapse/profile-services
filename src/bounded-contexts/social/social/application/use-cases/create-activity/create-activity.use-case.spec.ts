/**
 * CreateActivityUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ActivityType } from '@prisma/client';
import type { ActivityRepositoryPort, ActivityWithUser } from '../../ports/activity.port';
import type { FollowRepositoryPort } from '../../ports/follow.port';
import { CreateActivityUseCase } from './create-activity.use-case';

function createActivityRecord(overrides: Partial<ActivityWithUser> = {}): ActivityWithUser {
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
      displayName: 'Test',
      photoURL: null,
    },
    ...overrides,
  };
}

class StubActivityRepository {
  private _createResult: ActivityWithUser = createActivityRecord();
  private _findResult: ActivityWithUser | null = createActivityRecord();

  calls: Array<{ method: string; args: unknown[] }> = [];

  setCreateResult(val: ActivityWithUser) {
    this._createResult = val;
  }

  async createActivity(data: unknown) {
    this.calls.push({ method: 'createActivity', args: [data] });
    return this._createResult;
  }
  async findActivityWithUser() {
    return this._findResult;
  }
  async findActivitiesByUserIds() {
    return { data: [], total: 0 };
  }
  async findUserActivities() {
    return { data: [], total: 0 };
  }
  async findUserActivitiesByType() {
    return { data: [], total: 0 };
  }
  async deleteOlderThan() {
    return 0;
  }
}

class StubFollowRepository {
  async findFollowerIds() {
    return [];
  }
  async createFollow() {
    return {} as never;
  }
  async deleteFollow() {}
  async findFollow() {
    return null;
  }
  async findFollowers() {
    return { data: [], total: 0 };
  }
  async findFollowing() {
    return { data: [], total: 0 };
  }
  async countFollowers() {
    return 0;
  }
  async countFollowing() {
    return 0;
  }
  async findFollowingIds() {
    return [];
  }
  async userExists() {
    return true;
  }
}

const stubEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

const stubEventEmitter = {
  emit: () => true,
  emitAsync: () => Promise.resolve([]),
};

describe('CreateActivityUseCase', () => {
  let useCase: CreateActivityUseCase;
  let activityRepo: StubActivityRepository;

  beforeEach(() => {
    activityRepo = new StubActivityRepository();
    useCase = new CreateActivityUseCase(
      activityRepo as unknown as ActivityRepositoryPort,
      new StubFollowRepository() as unknown as FollowRepositoryPort,
      stubEventPublisher,
      stubEventEmitter as never,
    );
  });

  it('should create an activity record', async () => {
    const result = await useCase.execute('user-1', ActivityType.RESUME_CREATED, {
      resumeId: 'res-1',
    });

    expect(result).toHaveProperty('id', 'activity-1');
    expect(activityRepo.calls.some((c) => c.method === 'createActivity')).toBe(true);
  });

  it('should create activity with entityId and entityType', async () => {
    activityRepo.setCreateResult(
      createActivityRecord({
        id: 'activity-2',
        entityId: 'res-123',
        entityType: 'resume',
      }),
    );

    const result = await useCase.execute(
      'user-1',
      ActivityType.RESUME_UPDATED,
      { changes: ['title'] },
      'res-123',
      'resume',
    );

    expect(result).toHaveProperty('id', 'activity-2');
  });
});
