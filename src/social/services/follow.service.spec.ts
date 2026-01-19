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
  UserNotFoundError,
  BusinessRuleError,
  DuplicateResourceError,
} from '@octopus-synapse/profile-contracts';
import { FollowService } from './follow.service';
import { SocialRepository } from '../repositories/social.repository';
import { AppLoggerService } from '../../common/logger/logger.service';

// --- Mocks ---

const createMockRepository = () => ({
  createFollow: mock(() => Promise.resolve({ id: 'follow-1' })),
  deleteFollow: mock(() => Promise.resolve({ count: 1 })),
  findFollow: mock(() => Promise.resolve(null)),
  findUserById: mock(() => Promise.resolve({ id: 'user-1', name: 'Test' })),
  findFollowersWithPagination: mock(() => Promise.resolve([])),
  findFollowingWithPagination: mock(() => Promise.resolve([])),
  countFollowers: mock(() => Promise.resolve(0)),
  countFollowing: mock(() => Promise.resolve(0)),
  findFollowingIds: mock(() => Promise.resolve([])),
});

const createMockLogger = () => ({
  log: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

describe('FollowService', () => {
  let service: FollowService;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRepository = createMockRepository();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: SocialRepository, useValue: mockRepository },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  describe('follow', () => {
    it('should create a follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockRepository.findUserById.mockResolvedValue({
        id: followingId,
        name: 'User 2',
      });
      mockRepository.findFollow.mockResolvedValue(null);
      mockRepository.createFollow.mockResolvedValue({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      });

      const result = await service.follow(followerId, followingId);

      expect(result).toHaveProperty('id');
      expect(mockRepository.createFollow).toHaveBeenCalled();
    });

    it('should throw BusinessRuleError when trying to follow yourself', async () => {
      const userId = 'user-1';

      await expect(service.follow(userId, userId)).rejects.toThrow(
        BusinessRuleError,
      );
    });

    it('should throw DuplicateResourceError when already following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockRepository.findUserById.mockResolvedValue({
        id: followingId,
        name: 'User 2',
      });
      mockRepository.findFollow.mockResolvedValue({
        id: 'existing-follow',
        followerId,
        followingId,
      });

      await expect(service.follow(followerId, followingId)).rejects.toThrow(
        DuplicateResourceError,
      );
    });

    it('should throw UserNotFoundError when target user does not exist', async () => {
      const followerId = 'user-1';
      const followingId = 'nonexistent-user';

      mockRepository.findUserById.mockResolvedValue(null);

      await expect(service.follow(followerId, followingId)).rejects.toThrow(
        UserNotFoundError,
      );
    });
  });

  describe('unfollow', () => {
    it('should remove follow relationship', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockRepository.deleteFollow.mockResolvedValue({ count: 1 });

      await service.unfollow(followerId, followingId);

      expect(mockRepository.deleteFollow).toHaveBeenCalledWith(
        followerId,
        followingId,
      );
    });

    it('should not throw when not following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockRepository.deleteFollow.mockResolvedValue({ count: 0 });

      const result = await service.unfollow(followerId, followingId);
      expect(result).toBeUndefined();
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      mockRepository.findFollow.mockResolvedValue({
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

      mockRepository.findFollow.mockResolvedValue(null);

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

      mockRepository.findFollowersWithPagination.mockResolvedValue(followers);
      mockRepository.countFollowers.mockResolvedValue(2);

      const result = await service.getFollowers(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRepository.findFollowersWithPagination).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          skip: 0,
          take: 10,
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

      mockRepository.findFollowingWithPagination.mockResolvedValue(following);
      mockRepository.countFollowing.mockResolvedValue(1);

      const result = await service.getFollowing(userId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepository.findFollowingWithPagination).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('getFollowersCount', () => {
    it('should return count of followers', async () => {
      const userId = 'user-1';
      mockRepository.countFollowers.mockResolvedValue(42);

      const result = await service.getFollowersCount(userId);

      expect(result).toBe(42);
      expect(mockRepository.countFollowers).toHaveBeenCalledWith(userId);
    });
  });

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      const userId = 'user-1';
      mockRepository.countFollowing.mockResolvedValue(10);

      const result = await service.getFollowingCount(userId);

      expect(result).toBe(10);
      expect(mockRepository.countFollowing).toHaveBeenCalledWith(userId);
    });
  });

  describe('getFollowingIds', () => {
    it('should return array of followed user IDs', async () => {
      const userId = 'user-1';
      const following = [{ followingId: 'user-2' }, { followingId: 'user-3' }];

      mockRepository.findFollowingIds.mockResolvedValue(following);

      const result = await service.getFollowingIds(userId);

      expect(result).toEqual(['user-2', 'user-3']);
    });
  });
});
