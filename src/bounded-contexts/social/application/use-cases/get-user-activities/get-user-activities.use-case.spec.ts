/**
 * GetUserActivitiesUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ActivityRepositoryPort,
  ActivityType,
  type ActivityWithUser,
} from '../../ports/activity.port';
import { GetUserActivitiesUseCase } from './get-user-activities.use-case';

class StubActivityRepository implements ActivityRepositoryPort {
  private _data: ActivityWithUser[] = [];
  private _total = 0;

  setResult(data: ActivityWithUser[], total: number) {
    this._data = data;
    this._total = total;
  }

  async findUserActivities() {
    return { data: this._data, total: this._total };
  }
  async createActivity(): Promise<ActivityWithUser> {
    throw new Error('not used in test');
  }
  async findActivityWithUser() {
    return null;
  }
  async findActivitiesByUserIds() {
    return { data: [], total: 0 };
  }
  async findUserActivitiesByType() {
    return { data: [], total: 0 };
  }
  async deleteOlderThan() {
    return 0;
  }
}

describe('GetUserActivitiesUseCase', () => {
  let useCase: GetUserActivitiesUseCase;
  let repository: StubActivityRepository;

  beforeEach(() => {
    repository = new StubActivityRepository();
    useCase = new GetUserActivitiesUseCase(repository);
  });

  it('should return activities for a specific user', async () => {
    const activities: ActivityWithUser[] = [
      {
        id: 'a1',
        userId: 'user-1',
        type: ActivityType.RESUME_CREATED,
        metadata: {},
        entityId: null,
        entityType: null,
        createdAt: new Date(),
      },
    ];
    repository.setResult(activities, 1);

    const result = await useCase.execute('user-1', { page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
