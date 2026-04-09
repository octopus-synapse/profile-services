/**
 * GetActivitiesByTypeUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ActivityType } from '@prisma/client';
import type { ActivityRepositoryPort } from '../../ports/activity.port';
import { GetActivitiesByTypeUseCase } from './get-activities-by-type.use-case';

class StubActivityRepository {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async findUserActivitiesByType(userId: string, type: unknown, pagination: unknown) {
    this.calls.push({ method: 'findUserActivitiesByType', args: [userId, type, pagination] });
    return { data: [], total: 0 };
  }
  async createActivity() {
    return {} as never;
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
    useCase = new GetActivitiesByTypeUseCase(repository as unknown as ActivityRepositoryPort);
  });

  it('should filter activities by type', async () => {
    await useCase.execute('user-1', ActivityType.RESUME_CREATED, { page: 1, limit: 10 });

    expect(repository.calls.some((c) => c.method === 'findUserActivitiesByType')).toBe(true);
  });
});
