/**
 * GetActivitiesByTypeUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ActivityRepositoryPort,
  ActivityType,
  type ActivityWithUser,
} from '../../ports/activity.port';
import { GetActivitiesByTypeUseCase } from './get-activities-by-type.use-case';

class StubActivityRepository implements ActivityRepositoryPort {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async findUserActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: { page: number; limit: number },
  ) {
    this.calls.push({ method: 'findUserActivitiesByType', args: [userId, type, pagination] });
    return { data: [] as ActivityWithUser[], total: 0 };
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
  async findUserActivities() {
    return { data: [], total: 0 };
  }
  async deleteOlderThan() {
    return 0;
  }
}

describe('GetActivitiesByTypeUseCase', () => {
  let useCase: GetActivitiesByTypeUseCase;
  let repository: StubActivityRepository;

  beforeEach(() => {
    repository = new StubActivityRepository();
    useCase = new GetActivitiesByTypeUseCase(repository);
  });

  it('should filter activities by type', async () => {
    await useCase.execute('user-1', ActivityType.RESUME_CREATED, { page: 1, limit: 10 });

    expect(repository.calls.some((c) => c.method === 'findUserActivitiesByType')).toBe(true);
  });
});
