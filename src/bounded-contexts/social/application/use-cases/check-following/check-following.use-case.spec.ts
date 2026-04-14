/**
 * CheckFollowingUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  FollowRepositoryPort,
  type FollowWithUser,
} from '../../ports/follow.port';
import { CheckFollowingUseCase } from './check-following.use-case';

class StubFollowRepository implements FollowRepositoryPort {
  private _result: FollowWithUser | null = null;

  setFindFollowResult(val: FollowWithUser | null) {
    this._result = val;
  }

  async findFollow() {
    return this._result;
  }
  async createFollow(): Promise<FollowWithUser> {
    throw new Error('not used in test');
  }
  async deleteFollow() {}
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

describe('CheckFollowingUseCase', () => {
  let useCase: CheckFollowingUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new CheckFollowingUseCase(repository);
  });

  it('should return true when following', async () => {
    repository.setFindFollowResult({
      id: 'follow-1',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    });
    expect(await useCase.execute('user-1', 'user-2')).toBe(true);
  });

  it('should return false when not following', async () => {
    repository.setFindFollowResult(null);
    expect(await useCase.execute('user-1', 'user-2')).toBe(false);
  });
});
