/**
 * FollowUserUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { FollowRepositoryPort, FollowWithUser } from '../../ports/follow.port';
import { FollowUserUseCase } from './follow-user.use-case';

class StubFollowRepository {
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
    useCase = new FollowUserUseCase(
      repository as unknown as FollowRepositoryPort,
      stubEventPublisher,
    );
  });

  it('should create a follow relationship', async () => {
    const result = await useCase.execute('user-1', 'user-2');

    expect(result).toHaveProperty('id');
    expect(repository.calls.some((c) => c.method === 'createFollow')).toBe(true);
  });

  it('should throw BadRequestException when trying to follow yourself', async () => {
    await expect(useCase.execute('user-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when target user does not exist', async () => {
    repository.setUserExists(false);
    await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(NotFoundException);
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
