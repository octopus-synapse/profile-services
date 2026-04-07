/**
 * UnfollowUserUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { FollowRepositoryPort } from '../../ports/follow.port';
import { UnfollowUserUseCase } from './unfollow-user.use-case';

class StubFollowRepository {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async deleteFollow(followerId: string, followingId: string) {
    this.calls.push({ method: 'deleteFollow', args: [followerId, followingId] });
  }
  async createFollow() { return {} as never; }
  async findFollow() { return null; }
  async findFollowers() { return { data: [], total: 0 }; }
  async findFollowing() { return { data: [], total: 0 }; }
  async countFollowers() { return 0; }
  async countFollowing() { return 0; }
  async findFollowingIds() { return []; }
  async findFollowerIds() { return []; }
  async userExists() { return true; }
}

describe('UnfollowUserUseCase', () => {
  let useCase: UnfollowUserUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new UnfollowUserUseCase(repository as unknown as FollowRepositoryPort);
  });

  it('should remove follow relationship', async () => {
    await useCase.execute('user-1', 'user-2');

    expect(repository.calls.some((c) => c.method === 'deleteFollow')).toBe(true);
  });

  it('should not throw when not following', async () => {
    const result = await useCase.execute('user-1', 'user-2');
    expect(result).toBeUndefined();
  });
});
