/**
 * FollowService Tests
 *
 * Clean architecture: Stub Prisma, Pure Bun tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FollowService } from './follow.service';

/**
 * Follow record type
 */
interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: { id: string; name: string | null };
  following?: { id: string; name: string | null };
}

/**
 * User record type
 */
interface UserRecord {
  id: string;
  name: string | null;
}

/**
 * Stub Prisma Service for testing
 */
class StubPrismaService {
  private followCreateResult: FollowRecord | null = null;
  private followFindFirstResult: FollowRecord | null = null;
  private followFindManyResult: FollowRecord[] = [];
  private followCountResult = 0;
  private followDeleteManyResult = { count: 0 };
  private userFindUniqueResult: UserRecord | null = null;

  calls: Array<{ method: string; args: unknown[] }> = [];

  follow = {
    create: async (args: unknown): Promise<FollowRecord> => {
      this.calls.push({ method: 'follow.create', args: [args] });
      if (!this.followCreateResult) throw new Error('No create result set');
      return this.followCreateResult;
    },
    findFirst: async (args: unknown): Promise<FollowRecord | null> => {
      this.calls.push({ method: 'follow.findFirst', args: [args] });
      return this.followFindFirstResult;
    },
    findMany: async (args: unknown): Promise<FollowRecord[]> => {
      this.calls.push({ method: 'follow.findMany', args: [args] });
      return this.followFindManyResult;
    },
    count: async (args: unknown): Promise<number> => {
      this.calls.push({ method: 'follow.count', args: [args] });
      return this.followCountResult;
    },
    deleteMany: async (args: unknown): Promise<{ count: number }> => {
      this.calls.push({ method: 'follow.deleteMany', args: [args] });
      return this.followDeleteManyResult;
    },
  };

  user = {
    findUnique: async (args: unknown): Promise<UserRecord | null> => {
      this.calls.push({ method: 'user.findUnique', args: [args] });
      return this.userFindUniqueResult;
    },
  };

  setFollowCreateResult(result: FollowRecord): void {
    this.followCreateResult = result;
  }

  setFollowFindFirstResult(result: FollowRecord | null): void {
    this.followFindFirstResult = result;
  }

  setFollowFindManyResult(result: FollowRecord[]): void {
    this.followFindManyResult = result;
  }

  setFollowCountResult(count: number): void {
    this.followCountResult = count;
  }

  setFollowDeleteManyResult(count: number): void {
    this.followDeleteManyResult = { count };
  }

  setUserFindUniqueResult(result: UserRecord | null): void {
    this.userFindUniqueResult = result;
  }

  getCallsFor(method: string): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }
}

/**
 * Stub Logger
 */
const stubLogger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

/**
 * Stub Event Publisher
 */
const stubEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

describe('FollowService', () => {
  let service: FollowService;
  let stubPrisma: StubPrismaService;

  beforeEach(() => {
    stubPrisma = new StubPrismaService();

    service = new FollowService(
      stubPrisma as never,
      stubLogger as never,
      stubEventPublisher as never,
    );
  });

  describe('follow', () => {
    it('should create a follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setUserFindUniqueResult({ id: followingId, name: 'User 2' });
      stubPrisma.setFollowFindFirstResult(null);
      stubPrisma.setFollowCreateResult({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      });

      const result = await service.follow(followerId, followingId);

      expect(result).toHaveProperty('id');
      expect(stubPrisma.getCallsFor('follow.create').length).toBeGreaterThan(0);
    });

    it('should throw BadRequestException when trying to follow yourself', async () => {
      const userId = 'user-1';

      await expect(service.follow(userId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when already following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setUserFindUniqueResult({ id: followingId, name: 'User 2' });
      stubPrisma.setFollowFindFirstResult({
        id: 'existing-follow',
        followerId,
        followingId,
        createdAt: new Date(),
      });

      await expect(service.follow(followerId, followingId)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      const followerId = 'user-1';
      const followingId = 'nonexistent-user';

      stubPrisma.setUserFindUniqueResult(null);

      await expect(service.follow(followerId, followingId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unfollow', () => {
    it('should remove follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setFollowDeleteManyResult(1);

      await service.unfollow(followerId, followingId);

      const calls = stubPrisma.getCallsFor('follow.deleteMany');
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should not throw when not following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setFollowDeleteManyResult(0);

      const result = await service.unfollow(followerId, followingId);
      expect(result).toBeUndefined();
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setFollowFindFirstResult({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      });

      const result = await service.isFollowing(followerId, followingId);

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      stubPrisma.setFollowFindFirstResult(null);

      const result = await service.isFollowing(followerId, followingId);

      expect(result).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return paginated list of followers', async () => {
      const userId = 'user-1';
      const followers: FollowRecord[] = [
        {
          id: 'follow-1',
          followerId: 'user-2',
          followingId: userId,
          createdAt: new Date(),
          follower: { id: 'user-2', name: 'User 2' },
        },
        {
          id: 'follow-2',
          followerId: 'user-3',
          followingId: userId,
          createdAt: new Date(),
          follower: { id: 'user-3', name: 'User 3' },
        },
      ];

      stubPrisma.setFollowFindManyResult(followers);
      stubPrisma.setFollowCountResult(2);

      const result = await service.getFollowers(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getFollowing', () => {
    it('should return paginated list of following users', async () => {
      const userId = 'user-1';
      const following: FollowRecord[] = [
        {
          id: 'follow-1',
          followerId: userId,
          followingId: 'user-2',
          createdAt: new Date(),
          following: { id: 'user-2', name: 'User 2' },
        },
      ];

      stubPrisma.setFollowFindManyResult(following);
      stubPrisma.setFollowCountResult(1);

      const result = await service.getFollowing(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getFollowersCount', () => {
    it('should return count of followers', async () => {
      const userId = 'user-1';
      stubPrisma.setFollowCountResult(42);

      const result = await service.getFollowersCount(userId);

      expect(result).toBe(42);
    });
  });

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      const userId = 'user-1';
      stubPrisma.setFollowCountResult(10);

      const result = await service.getFollowingCount(userId);

      expect(result).toBe(10);
    });
  });

  describe('getFollowingIds', () => {
    it('should return array of followed user IDs', async () => {
      const userId = 'user-1';
      const following: FollowRecord[] = [
        {
          id: 'f1',
          followerId: userId,
          followingId: 'user-2',
          createdAt: new Date(),
        },
        {
          id: 'f2',
          followerId: userId,
          followingId: 'user-3',
          createdAt: new Date(),
        },
      ];

      stubPrisma.setFollowFindManyResult(following);

      const result = await service.getFollowingIds(userId);

      expect(result).toEqual(['user-2', 'user-3']);
    });
  });
});
