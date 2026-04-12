/**
 * GetFollowingUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { FollowRepositoryPort, FollowWithUser } from '../../ports/follow.port';
import { GetFollowingUseCase } from './get-following.use-case';

class StubFollowRepository {
  private _data: FollowWithUser[] = [];
  private _total = 0;

  setResult(data: FollowWithUser[], total: number) {
    this._data = data;
    this._total = total;
  }

  async findFollowing() {
    return { data: this._data, total: this._total };
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
  async countFollowers() {
    return 0;
  }
  async countFollowing() {
    return 0;
  }
  async findFollowingIds() {
    return [];
  }
  async findFollowerIds() {
    return [];
  }
  async userExists() {
    return true;
  }
}

describe('GetFollowingUseCase', () => {
  let useCase: GetFollowingUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new GetFollowingUseCase(repository as unknown as FollowRepositoryPort);
  });

  it('should return paginated list of following users', async () => {
    const following: FollowWithUser[] = [
      { id: 'f1', followerId: 'user-1', followingId: 'user-2', createdAt: new Date() },
    ];
    repository.setResult(following, 1);

    const result = await useCase.execute('user-1', { page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
