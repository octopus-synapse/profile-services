/**
 * PurgeOldActivitiesUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { ActivityRepositoryPort } from '../../ports/activity.port';
import { PurgeOldActivitiesUseCase } from './purge-old-activities.use-case';

class StubActivityRepository {
  private _deleteCount = 0;
  calls: Array<{ method: string; args: unknown[] }> = [];

  setDeleteCount(n: number) {
    this._deleteCount = n;
  }

  async deleteOlderThan(date: Date) {
    this.calls.push({ method: 'deleteOlderThan', args: [date] });
    return this._deleteCount;
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
  async findUserActivitiesByType() {
    return { data: [], total: 0 };
  }
}

describe('PurgeOldActivitiesUseCase', () => {
  let useCase: PurgeOldActivitiesUseCase;
  let repository: StubActivityRepository;

  beforeEach(() => {
    repository = new StubActivityRepository();
    useCase = new PurgeOldActivitiesUseCase(repository as unknown as ActivityRepositoryPort);
  });

  it('should delete activities older than specified days', async () => {
    repository.setDeleteCount(5);

    const count = await useCase.execute(30);

    expect(count).toBe(5);
    expect(repository.calls.some((c) => c.method === 'deleteOlderThan')).toBe(true);
  });
});
