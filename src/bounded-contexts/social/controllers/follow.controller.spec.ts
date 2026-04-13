/**
 * FollowController Tests
 *
 * Clean architecture: Stub Services, Pure Bun tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ConflictException } from '@nestjs/common';
import { FollowController } from './follow.controller';

/**
 * Follow record type
 */
interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  following?: { id: string; name: string };
  createdAt: Date;
}

/**
 * User reference type
 */
interface UserRef {
  id: string;
  name: string;
}

/**
 * Paginated response type
 */
interface PaginatedFollow<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Stub FollowService for testing
 */
class StubFollowService {
  private followResult: FollowRecord = {
    id: 'follow-1',
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date(),
  };
  private followError: Error | null = null;
  private followersResult: PaginatedFollow<{ id: string; follower: UserRef }> = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };
  private followingResult: PaginatedFollow<{ id: string; following: UserRef }> = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };
  private isFollowingResult = false;
  private socialStatsResult = { followers: 0, following: 0, connections: 0 };

  calls: Array<{ method: string; args: unknown[] }> = [];

  setFollowResult(result: FollowRecord): void {
    this.followResult = result;
  }

  setFollowError(error: Error): void {
    this.followError = error;
  }

  setFollowersResult(result: PaginatedFollow<{ id: string; follower: UserRef }>): void {
    this.followersResult = result;
  }

  setFollowingResult(result: PaginatedFollow<{ id: string; following: UserRef }>): void {
    this.followingResult = result;
  }

  setIsFollowingResult(result: boolean): void {
    this.isFollowingResult = result;
  }

  setSocialStatsResult(result: {
    followers: number;
    following: number;
    connections: number;
  }): void {
    this.socialStatsResult = result;
  }

  async follow(followerId: string, followingId: string): Promise<FollowRecord> {
    this.calls.push({ method: 'follow', args: [followerId, followingId] });
    if (this.followError) throw this.followError;
    return this.followResult;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    this.calls.push({ method: 'unfollow', args: [followerId, followingId] });
  }

  async getFollowers(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedFollow<{ id: string; follower: UserRef }>> {
    this.calls.push({ method: 'getFollowers', args: [userId, options] });
    return this.followersResult;
  }

  async getFollowing(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedFollow<{ id: string; following: UserRef }>> {
    this.calls.push({ method: 'getFollowing', args: [userId, options] });
    return this.followingResult;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    this.calls.push({ method: 'isFollowing', args: [followerId, followingId] });
    return this.isFollowingResult;
  }

  async getSocialStats(
    userId: string,
  ): Promise<{ followers: number; following: number; connections: number }> {
    this.calls.push({ method: 'getSocialStats', args: [userId] });
    return this.socialStatsResult;
  }

  getLastCall(method: string): { method: string; args: unknown[] } | undefined {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

/**
 * Stub ActivityService for testing
 */
class StubActivityService {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async logFollowedUser(userId: string, targetId: string, targetName: string): Promise<void> {
    this.calls.push({
      method: 'logFollowedUser',
      args: [userId, targetId, targetName],
    });
  }
}

describe('FollowController', () => {
  let controller: FollowController;
  let stubFollowService: StubFollowService;
  let stubActivityService: StubActivityService;

  beforeEach(() => {
    stubFollowService = new StubFollowService();
    stubActivityService = new StubActivityService();
    controller = new FollowController(stubFollowService as never, stubActivityService as never);
  });

  describe('POST /users/:userId/follow', () => {
    it('should follow a user successfully', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      const result = await controller.follow(mockUser as never, targetUserId);

      expect(result.success).toBe(true);

      const call = stubFollowService.getLastCall('follow');
      expect(call?.args[0]).toBe(currentUserId);
      expect(call?.args[1]).toBe(targetUserId);
    });

    it('should create activity when following', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      stubFollowService.setFollowResult({
        id: 'follow-1',
        followerId: currentUserId,
        followingId: targetUserId,
        following: { id: targetUserId, name: 'Target User' },
        createdAt: new Date(),
      });

      await controller.follow(mockUser as never, targetUserId);

      // Give time for fire-and-forget activity logging
      await new Promise((r) => setTimeout(r, 10));
      expect(stubActivityService.calls.length).toBeGreaterThan(0);
    });

    it('should return error response on conflict', async () => {
      const mockUser = { userId: 'user-1' };
      stubFollowService.setFollowError(new ConflictException('Already following'));

      await expect(controller.follow(mockUser as never, 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('DELETE /users/:userId/follow', () => {
    it('should unfollow a user successfully', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      const result = await controller.unfollow(mockUser as never, targetUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ unfollowed: true });

      const call = stubFollowService.getLastCall('unfollow');
      expect(call?.args[0]).toBe(currentUserId);
      expect(call?.args[1]).toBe(targetUserId);
    });
  });

  describe('GET /users/:userId/followers', () => {
    it('should return paginated followers list', async () => {
      const userId = 'user-1';
      const mockFollowers: PaginatedFollow<{ id: string; follower: UserRef }> = {
        data: [{ id: 'follow-1', follower: { id: 'user-2', name: 'User 2' } }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      stubFollowService.setFollowersResult(mockFollowers);

      const result = await controller.getFollowers(userId, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ followers: mockFollowers });

      const call = stubFollowService.getLastCall('getFollowers');
      expect(call?.args[0]).toBe(userId);
      expect(call?.args[1]).toEqual({ page: 1, limit: 10 });
    });
  });

  describe('GET /users/:userId/following', () => {
    it('should return paginated following list', async () => {
      const userId = 'user-1';
      const mockFollowing: PaginatedFollow<{
        id: string;
        following: UserRef;
      }> = {
        data: [{ id: 'follow-1', following: { id: 'user-3', name: 'User 3' } }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      stubFollowService.setFollowingResult(mockFollowing);

      const result = await controller.getFollowing(userId, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ following: mockFollowing });
    });
  });

  describe('GET /users/:userId/is-following', () => {
    it('should return true when following', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      stubFollowService.setIsFollowingResult(true);

      const result = await controller.isFollowing(mockUser as never, targetUserId);

      expect(result.success).toBe(true);
      expect(result.data?.isFollowing).toBe(true);
    });

    it('should return false when not following', async () => {
      const mockUser = { userId: 'user-1' };
      stubFollowService.setIsFollowingResult(false);

      const result = await controller.isFollowing(mockUser as never, 'user-2');

      expect(result.data?.isFollowing).toBe(false);
    });
  });

  describe('GET /users/:userId/social-stats', () => {
    it('should return follower and following counts', async () => {
      const userId = 'user-1';
      stubFollowService.setSocialStatsResult({
        followers: 100,
        following: 50,
        connections: 30,
      });

      const result = await controller.getSocialStats(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ followers: 100, following: 50, connections: 30 });
    });
  });
});
