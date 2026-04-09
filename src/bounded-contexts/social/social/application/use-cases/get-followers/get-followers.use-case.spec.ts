/**
 * GetFollowersUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { FollowRepositoryPort, FollowWithUser } from '../../ports/follow.port';
import { GetFollowersUseCase } from './get-followers.use-case';

class StubFollowRepository {
  private _data: FollowWithUser[] = [];
  private _total = 0;

  setResult(data: FollowWithUser[], total: number) {
    this._data = data;
    this._total = total;
  }

  async findFollowers() {
    return { data: this._data, total: this._total };
  }
  async createFollow() {
    return {} as never;
  }
  async deleteFollow() {}
  async findFollow() {
    return null;
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
  async findFollowerIds() {
    return [];
  }
  async userExists() {
    return true;
  }
}

describe('GetFollowersUseCase', () => {
  let useCase: GetFollowersUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new GetFollowersUseCase(repository as unknown as FollowRepositoryPort);
  });

  it('should return paginated list of followers', async () => {
    const followers: FollowWithUser[] = [
      { id: 'f1', followerId: 'user-2', followingId: 'user-1', createdAt: new Date() },
      { id: 'f2', followerId: 'user-3', followingId: 'user-1', createdAt: new Date() },
    ];
    repository.setResult(followers, 2);

    const result = await useCase.execute('user-1', { page: 1, limit: 10 });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });
});
