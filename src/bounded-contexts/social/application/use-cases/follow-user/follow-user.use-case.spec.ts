/**
 * FollowUserUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { FollowRepositoryPort, type FollowWithUser } from '../../ports/follow.port';
import { FollowUserUseCase } from './follow-user.use-case';

class StubFollowRepository implements FollowRepositoryPort {
  private _userExists = true;
  private _findFollowResult: FollowWithUser | null = null;
  private _createFollowResult: FollowWithUser = {
    id: 'follow-1',
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date(),
  };

  calls: Array<{ method: string; args: unknown[] }> = [];

  setUserExists(val: boolean) {
    this._userExists = val;
  }
  setFindFollowResult(val: FollowWithUser | null) {
    this._findFollowResult = val;
  }
  setCreateFollowResult(val: FollowWithUser) {
    this._createFollowResult = val;
  }

  async userExists(userId: string) {
    this.calls.push({ method: 'userExists', args: [userId] });
    return this._userExists;
  }
  async findFollow(followerId: string, followingId: string) {
    this.calls.push({ method: 'findFollow', args: [followerId, followingId] });
    return this._findFollowResult;
  }
  async createFollow(followerId: string, followingId: string) {
    this.calls.push({ method: 'createFollow', args: [followerId, followingId] });
    return this._createFollowResult;
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
}

const stubEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

describe('FollowUserUseCase', () => {
  let useCase: FollowUserUseCase;
  let repository: StubFollowRepository;

  beforeEach(() => {
    repository = new StubFollowRepository();
    useCase = new FollowUserUseCase(repository, stubEventPublisher);
  });

  it('should create a follow relationship', async () => {
    const result = await useCase.execute('user-1', 'user-2');

    expect(result).toHaveProperty('id');
    expect(repository.calls.some((c) => c.method === 'createFollow')).toBe(true);
  });

  it('should throw ValidationException when trying to follow yourself', async () => {
    await expect(useCase.execute('user-1', 'user-1')).rejects.toThrow(ValidationException);
  });

  it('should throw EntityNotFoundException when target user does not exist', async () => {
    repository.setUserExists(false);
    await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(EntityNotFoundException);
  });

  it('should throw ConflictException when already following', async () => {
    repository.setFindFollowResult({
      id: 'existing',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    });
    await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(ConflictException);
  });
});
