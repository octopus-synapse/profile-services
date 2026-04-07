/**
 * GetSocialStatsUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { FollowRepositoryPort } from '../../ports/follow.port';
import { GetSocialStatsUseCase } from './get-social-stats.use-case';

class StubFollowRepository {
  private _followers = 0;
  private _following = 0;

  setFollowersCount(n: number) { this._followers = n; }
  setFollowingCount(n: number) { this._following = n; }

  async countFollowers() { return this._followers; }
  async countFollowing() { return this._following; }
  async createFollow() { return {} as never; }
  async deleteFollow() {}
  async findFollow() { return null; }
  async findFollowers() { return { data: [], total: 0 }; }
  async findFollowing() { return { data: [], total: 0 }; }
  async findFollowingIds() { return []; }
  async findFollowerIds() { return []; }
  async userExists() { return true; }
}

describe('GetSocialStatsUseCase', () => {
  let useCase: GetSocialStatsUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new GetSocialStatsUseCase(repository as unknown as FollowRepositoryPort);
  });

  it('should return follower and following counts', async () => {
    repository.setFollowersCount(42);
    repository.setFollowingCount(10);

    const result = await useCase.execute('user-1');

    expect(result).toEqual({ followers: 42, following: 10 });
  });
});
