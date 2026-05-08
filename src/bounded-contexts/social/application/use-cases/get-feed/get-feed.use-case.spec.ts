/**
 * GetFeedUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  ActivityRepositoryPort,
  ActivityType,
  type ActivityWithUser,
} from '../../ports/activity.port';
import { FollowRepositoryPort, type FollowWithUser } from '../../ports/follow.port';
import { GetFeedUseCase } from './get-feed.use-case';

class StubActivityRepository implements ActivityRepositoryPort {
  private _items: ActivityWithUser[] = [];
  private _total = 0;

  setResult(items: ActivityWithUser[], total: number) {
    this._items = items;
    this._total = total;
  }

  async findActivitiesByUserIds() {
    return { items: this._items, total: this._total };
  }
  async createActivity(): Promise<ActivityWithUser> {
    throw new Error('not used in test');
  }
  async findActivityWithUser() {
    return null;
  }
  async findUserActivities() {
    return { items: [], total: 0 };
  }
  async findUserActivitiesByType() {
    return { items: [], total: 0 };
  }
  async deleteOlderThan() {
    return 0;
  }
  async userExists() {
    return true;
  }
}

class StubFollowRepository implements FollowRepositoryPort {
  private _ids: string[] = ['user-2', 'user-3'];

  setFollowingIds(ids: string[]) {
    this._ids = ids;
  }

  async findFollowingIds() {
    return this._ids;
  }
  async createFollow(): Promise<FollowWithUser> {
    throw new Error('not used in test');
  }
  async deleteFollow() {}
  async findFollow() {
    return null;
  }
  async findFollowers() {
    return { items: [], total: 0 };
  }
  async findFollowing() {
    return { items: [], total: 0 };
  }
  async countFollowers() {
    return 0;
  }
  async countFollowing() {
    return 0;
  }
  async findFollowerIds() {
    return [];
  }
  async userExists() {
    return true;
  }
}

describe('GetFeedUseCase', () => {
  let useCase: GetFeedUseCase;
  let activityRepo: StubActivityRepository;
  let followRepo: StubFollowRepository;

  beforeEach(() => {
    activityRepo = new StubActivityRepository();
    followRepo = new StubFollowRepository();
    useCase = new GetFeedUseCase(activityRepo, followRepo, stubLogger);
  });

  it('should return activities from followed users', async () => {
    const activities: ActivityWithUser[] = [
      {
        id: 'a1',
        userId: 'user-2',
        type: ActivityType.RESUME_CREATED,
        metadata: {},
        entityId: null,
        entityType: null,
        createdAt: new Date(),
      },
      {
        id: 'a2',
        userId: 'user-3',
        type: ActivityType.SKILL_ADDED,
        metadata: {},
        entityId: null,
        entityType: null,
        createdAt: new Date(),
      },
    ];
    activityRepo.setResult(activities, 2);

    const result = await useCase.execute('user-1', { page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should return empty feed when not following anyone', async () => {
    followRepo.setFollowingIds([]);

    const result = await useCase.execute('user-1', { page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
