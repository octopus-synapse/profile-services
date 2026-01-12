/**
 * FollowService Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Test observable behavior."
 *
 * Key scenarios:
 * - Follow a user
 * - Unfollow a user
 * - Cannot follow yourself
 * - Cannot follow twice
 * - Get followers list
 * - Get following list
 * - Check if following
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

// --- Mocks ---

const createMockPrismaService = () => ({
  follow: {
    create: mock(() => Promise.resolve({ id: 'follow-1' })),
    delete: mock(() => Promise.resolve()),
    deleteMany: mock(() => Promise.resolve({ count: 1 })),
    findUnique: mock(() => Promise.resolve(null)),
    findFirst: mock(() => Promise.resolve(null)),
    findMany: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
  },
  user: {
    findUnique: mock(() => Promise.resolve({ id: 'user-1', name: 'Test' })),
  },
  $transaction: mock((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      follow: {
        create: mock(() => Promise.resolve({ id: 'follow-1' })),
        findFirst: mock(() => Promise.resolve(null)),
      },
    }),
  ),
});

const createMockLogger = () => ({
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

describe('FollowService', () => {
  let service: FollowService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  describe('follow', () => {
    it('should create a follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: followingId,
        name: 'User 2',
      });
      mockPrisma.follow.findFirst.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      });

      const result = await service.follow(followerId, followingId);

      expect(result).toHaveProperty('id');
      expect(mockPrisma.follow.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to follow yourself', async () => {
      const userId = 'user-1';

      await expect(service.follow(userId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when already following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: followingId,
        name: 'User 2',
      });
      mockPrisma.follow.findFirst.mockResolvedValue({
        id: 'existing-follow',
        followerId,
        followingId,
      });

      await expect(service.follow(followerId, followingId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      const followerId = 'user-1';
      const followingId = 'nonexistent-user';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.follow(followerId, followingId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unfollow', () => {
    it('should remove follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 1 });

      await service.unfollow(followerId, followingId);

      expect(mockPrisma.follow.deleteMany).toHaveBeenCalledWith({
        where: { followerId, followingId },
      });
    });

    it('should not throw when not following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unfollow(followerId, followingId);
      expect(result).toBeUndefined();
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.follow.findFirst.mockResolvedValue({
        id: 'follow-1',
        followerId,
        followingId,
      });

      const result = await service.isFollowing(followerId, followingId);

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockPrisma.follow.findFirst.mockResolvedValue(null);

      const result = await service.isFollowing(followerId, followingId);

      expect(result).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return paginated list of followers', async () => {
      const userId = 'user-1';
      const followers = [
        {
          id: 'follow-1',
          followerId: 'user-2',
          follower: { id: 'user-2', name: 'User 2' },
        },
        {
          id: 'follow-2',
          followerId: 'user-3',
          follower: { id: 'user-3', name: 'User 3' },
        },
      ];

      mockPrisma.follow.findMany.mockResolvedValue(followers);
      mockPrisma.follow.count.mockResolvedValue(2);

      const result = await service.getFollowers(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followingId: userId },
        }),
      );
    });
  });

  describe('getFollowing', () => {
    it('should return paginated list of following users', async () => {
      const userId = 'user-1';
      const following = [
        {
          id: 'follow-1',
          followingId: 'user-2',
          following: { id: 'user-2', name: 'User 2' },
        },
      ];

      mockPrisma.follow.findMany.mockResolvedValue(following);
      mockPrisma.follow.count.mockResolvedValue(1);

      const result = await service.getFollowing(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followerId: userId },
        }),
      );
    });
  });

  describe('getFollowersCount', () => {
    it('should return count of followers', async () => {
      const userId = 'user-1';
      mockPrisma.follow.count.mockResolvedValue(42);

      const result = await service.getFollowersCount(userId);

      expect(result).toBe(42);
      expect(mockPrisma.follow.count).toHaveBeenCalledWith({
        where: { followingId: userId },
      });
    });
  });

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      const userId = 'user-1';
      mockPrisma.follow.count.mockResolvedValue(10);

      const result = await service.getFollowingCount(userId);

      expect(result).toBe(10);
      expect(mockPrisma.follow.count).toHaveBeenCalledWith({
        where: { followerId: userId },
      });
    });
  });

  describe('getFollowingIds', () => {
    it('should return array of followed user IDs', async () => {
      const userId = 'user-1';
      const following = [{ followingId: 'user-2' }, { followingId: 'user-3' }];

      mockPrisma.follow.findMany.mockResolvedValue(following);

      const result = await service.getFollowingIds(userId);

      expect(result).toEqual(['user-2', 'user-3']);
    });
  });
});
