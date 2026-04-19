/**
 * GetFollowingIdsUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { FollowRepositoryPort, type FollowWithUser } from '../../ports/follow.port';
import { GetFollowingIdsUseCase } from './get-following-ids.use-case';

class StubFollowRepository implements FollowRepositoryPort {
  private _ids: string[] = [];

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
  async findFollowerIds() {
    return [];
  }
  async userExists() {
    return true;
  }
}

describe('GetFollowingIdsUseCase', () => {
  let useCase: GetFollowingIdsUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new GetFollowingIdsUseCase(repository);
  });

  it('should return array of followed user IDs', async () => {
    repository.setFollowingIds(['user-2', 'user-3']);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(['user-2', 'user-3']);
  });
});
