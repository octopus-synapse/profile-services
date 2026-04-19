/**
 * CreateActivityUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ActivityRepositoryPort,
  ActivityType,
  type ActivityWithUser,
} from '../../ports/activity.port';
import { FollowRepositoryPort } from '../../ports/follow.port';
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
      photoURL: null,
    },
    ...overrides,
  };
}

class StubActivityRepository implements ActivityRepositoryPort {
  private _createResult: ActivityWithUser = createActivityRecord();
  private _findResult: ActivityWithUser | null = createActivityRecord();

  calls: Array<{ method: string; args: unknown[] }> = [];

  setCreateResult(val: ActivityWithUser) {
    this._createResult = val;
  }

  async createActivity(data: Parameters<ActivityRepositoryPort['createActivity']>[0]) {
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

class StubFollowRepository implements FollowRepositoryPort {
  async findFollowerIds() {
    return [];
  }
  async createFollow(): Promise<never> {
    throw new Error('not used in test');
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
      activityRepo,
      new StubFollowRepository(),
      stubEventPublisher,
      stubEventEmitter,
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
