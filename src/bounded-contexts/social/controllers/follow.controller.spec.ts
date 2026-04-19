/**
 * FollowController Tests — port-based stubs.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ConflictException } from '@nestjs/common';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { ConnectionUser, ConnectionWithUser } from '../application/ports/connection.port';
import {
  ActivityLoggerPort,
  ConnectionReaderPort,
  FollowReaderPort,
} from '../application/ports/facade.ports';
import type {
  FollowWithUser,
  PaginatedResult,
  PaginationParams,
} from '../application/ports/follow.port';
import { FollowController } from './follow.controller';

const makeUser = (userId: string): UserPayload => ({
  userId,
  email: `${userId}@test.local`,
  hasCompletedOnboarding: true,
});

const emptyPage = <T>(pagination: PaginationParams): PaginatedResult<T> => ({
  data: [],
  total: 0,
  page: pagination.page,
  limit: pagination.limit,
  totalPages: 0,
});

class StubFollowReader extends FollowReaderPort {
  private followResult: FollowWithUser = {
    id: 'follow-1',
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date(),
  };
  private followError: Error | null = null;
  private followersResult: PaginatedResult<FollowWithUser> = emptyPage({ page: 1, limit: 10 });
  private followingResult: PaginatedResult<FollowWithUser> = emptyPage({ page: 1, limit: 10 });
  private isFollowingResult = false;
  private socialStatsResult = { followers: 0, following: 0, connections: 0 };

  follow = mock(async (_follower: string, _following: string): Promise<FollowWithUser> => {
    if (this.followError) throw this.followError;
    return this.followResult;
  });
  unfollow = mock(async (_follower: string, _following: string): Promise<void> => {});
  isFollowing = mock(async (): Promise<boolean> => this.isFollowingResult);
  getFollowers = mock(
    async (
      _userId: string,
      _pagination: PaginationParams,
      _viewerId?: string,
    ): Promise<PaginatedResult<FollowWithUser>> => this.followersResult,
  );
  getFollowing = mock(
    async (
      _userId: string,
      _pagination: PaginationParams,
      _viewerId?: string,
    ): Promise<PaginatedResult<FollowWithUser>> => this.followingResult,
  );
  getSocialStats = mock(
    async (): Promise<{ followers: number; following: number; connections: number }> =>
      this.socialStatsResult,
  );

  setFollowResult(r: FollowWithUser): void {
    this.followResult = r;
  }
  setFollowError(err: Error): void {
    this.followError = err;
  }
  setFollowersResult(r: PaginatedResult<FollowWithUser>): void {
    this.followersResult = r;
  }
  setFollowingResult(r: PaginatedResult<FollowWithUser>): void {
    this.followingResult = r;
  }
  setIsFollowingResult(r: boolean): void {
    this.isFollowingResult = r;
  }
  setSocialStatsResult(r: { followers: number; following: number; connections: number }): void {
    this.socialStatsResult = r;
  }
}

class StubActivityLogger extends ActivityLoggerPort {
  logFollowedUser = mock(async () => {});
}

class StubConnectionReader extends ConnectionReaderPort {
  getPendingRequests = mock(
    async (
      _userId: string,
      pagination: PaginationParams,
    ): Promise<PaginatedResult<ConnectionWithUser & { user?: ConnectionUser }>> =>
      emptyPage(pagination),
  );
}

describe('FollowController', () => {
  let controller: FollowController;
  let stubFollowReader: StubFollowReader;
  let stubActivityLogger: StubActivityLogger;
  let stubConnectionReader: StubConnectionReader;

  beforeEach(() => {
    stubFollowReader = new StubFollowReader();
    stubActivityLogger = new StubActivityLogger();
    stubConnectionReader = new StubConnectionReader();
    controller = new FollowController(stubFollowReader, stubActivityLogger, stubConnectionReader);
  });

  describe('POST /users/:userId/follow', () => {
    it('should follow a user successfully', async () => {
      const result = await controller.follow(makeUser('user-1'), 'user-2');

      expect(result.success).toBe(true);
      expect(stubFollowReader.follow).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should create activity when following', async () => {
      stubFollowReader.setFollowResult({
        id: 'follow-1',
        followerId: 'user-1',
        followingId: 'user-2',
        following: { id: 'user-2', name: 'Target User', username: null, photoURL: null },
        createdAt: new Date(),
      });

      await controller.follow(makeUser('user-1'), 'user-2');

      await new Promise((r) => setTimeout(r, 10));
      expect(stubActivityLogger.logFollowedUser).toHaveBeenCalled();
    });

    it('should return error response on conflict', async () => {
      stubFollowReader.setFollowError(new ConflictException('Already following'));

      await expect(controller.follow(makeUser('user-1'), 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('DELETE /users/:userId/follow', () => {
    it('should unfollow a user successfully', async () => {
      const result = await controller.unfollow(makeUser('user-1'), 'user-2');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ unfollowed: true });
      expect(stubFollowReader.unfollow).toHaveBeenCalledWith('user-1', 'user-2');
    });
  });

  describe('GET /users/:userId/followers', () => {
    it('should return paginated followers list', async () => {
      const mockFollowers: PaginatedResult<FollowWithUser> = {
        data: [
          {
            id: 'follow-1',
            followerId: 'user-2',
            followingId: 'user-1',
            createdAt: new Date(),
            follower: { id: 'user-2', name: 'User 2', username: null, photoURL: null },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      stubFollowReader.setFollowersResult(mockFollowers);

      const result = await controller.getFollowers(makeUser('viewer-1'), 'user-1', 1, 10);

      expect(result.success).toBe(true);
      expect(stubFollowReader.getFollowers).toHaveBeenCalledWith(
        'user-1',
        {
          page: 1,
          limit: 10,
        },
        'viewer-1',
      );
    });
  });

  describe('GET /users/:userId/following', () => {
    it('should return paginated following list', async () => {
      const mockFollowing: PaginatedResult<FollowWithUser> = {
        data: [
          {
            id: 'follow-1',
            followerId: 'user-1',
            followingId: 'user-3',
            createdAt: new Date(),
            following: { id: 'user-3', name: 'User 3', username: null, photoURL: null },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      stubFollowReader.setFollowingResult(mockFollowing);

      const result = await controller.getFollowing(makeUser('viewer-1'), 'user-1', 1, 10);

      expect(result.success).toBe(true);
    });
  });

  describe('GET /users/:userId/is-following', () => {
    it('should return true when following', async () => {
      stubFollowReader.setIsFollowingResult(true);

      const result = await controller.isFollowing(makeUser('user-1'), 'user-2');

      expect(result.data?.isFollowing).toBe(true);
    });

    it('should return false when not following', async () => {
      stubFollowReader.setIsFollowingResult(false);

      const result = await controller.isFollowing(makeUser('user-1'), 'user-2');

      expect(result.data?.isFollowing).toBe(false);
    });
  });

  describe('GET /users/:userId/social-stats', () => {
    it('should return follower and following counts', async () => {
      stubFollowReader.setSocialStatsResult({
        followers: 100,
        following: 50,
        connections: 30,
      });

      const result = await controller.getSocialStats('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ followers: 100, following: 50, connections: 30 });
    });
  });
});
