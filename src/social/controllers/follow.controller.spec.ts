/**
 * FollowController Tests
 *
 * TDD approach: RED -> GREEN -> REFACTOR
 *
 * Kent Beck: "Test the interface, not the implementation."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { FollowController } from './follow.controller';
import { FollowService } from '../services/follow.service';
import { ActivityService } from '../services/activity.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

// --- Mocks ---

const createMockFollowService = () => ({
  follow: mock(() =>
    Promise.resolve({
      id: 'follow-1',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    }),
  ),
  unfollow: mock(() => Promise.resolve()),
  isFollowing: mock(() => Promise.resolve(false)),
  getFollowers: mock(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
  ),
  getFollowing: mock(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
  ),
  getSocialStats: mock(() => Promise.resolve({ followers: 0, following: 0 })),
});

const createMockActivityService = () => ({
  logFollowedUser: mock(() => Promise.resolve()),
});

describe('FollowController', () => {
  let controller: FollowController;
  let mockFollowService: ReturnType<typeof createMockFollowService>;
  let mockActivityService: ReturnType<typeof createMockActivityService>;

  beforeEach(async () => {
    mockFollowService = createMockFollowService();
    mockActivityService = createMockActivityService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowController],
      providers: [
        { provide: FollowService, useValue: mockFollowService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    controller = module.get<FollowController>(FollowController);
  });

  describe('POST /users/:userId/follow', () => {
    it('should follow a user successfully', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      const result = await controller.follow(mockUser as any, targetUserId);

      expect(result.success).toBe(true);
      expect(mockFollowService.follow).toHaveBeenCalledWith(
        currentUserId,
        targetUserId,
      );
    });

    it('should create activity when following', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      mockFollowService.follow.mockResolvedValue({
        id: 'follow-1',
        followerId: currentUserId,
        followingId: targetUserId,
        following: { id: targetUserId, name: 'Target User' },
      });

      await controller.follow(mockUser as any, targetUserId);

      expect(mockActivityService.logFollowedUser).toHaveBeenCalled();
    });

    it('should return error response on conflict', async () => {
      const mockUser = { userId: 'user-1' };
      mockFollowService.follow.mockRejectedValue(
        new ConflictException('Already following'),
      );

      await expect(
        controller.follow(mockUser as any, 'user-2'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /users/:userId/follow', () => {
    it('should unfollow a user successfully', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      const result = await controller.unfollow(mockUser as any, targetUserId);

      expect(result.success).toBe(true);
      expect(mockFollowService.unfollow).toHaveBeenCalledWith(
        currentUserId,
        targetUserId,
      );
    });
  });

  describe('GET /users/:userId/followers', () => {
    it('should return paginated followers list', async () => {
      const userId = 'user-1';
      const mockFollowers = {
        data: [{ id: 'follow-1', follower: { id: 'user-2', name: 'User 2' } }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockFollowService.getFollowers.mockResolvedValue(mockFollowers);

      const result = await controller.getFollowers(userId, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFollowers);
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 10,
      });
    });
  });

  describe('GET /users/:userId/following', () => {
    it('should return paginated following list', async () => {
      const userId = 'user-1';
      const mockFollowing = {
        data: [{ id: 'follow-1', following: { id: 'user-3', name: 'User 3' } }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockFollowService.getFollowing.mockResolvedValue(mockFollowing);

      const result = await controller.getFollowing(userId, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFollowing);
    });
  });

  describe('GET /users/:userId/is-following', () => {
    it('should return true when following', async () => {
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const mockUser = { userId: currentUserId };

      mockFollowService.isFollowing.mockResolvedValue(true);

      const result = await controller.isFollowing(
        mockUser as any,
        targetUserId,
      );

      expect(result.success).toBe(true);
      expect(result.data.isFollowing).toBe(true);
    });

    it('should return false when not following', async () => {
      const mockUser = { userId: 'user-1' };
      mockFollowService.isFollowing.mockResolvedValue(false);

      const result = await controller.isFollowing(mockUser as any, 'user-2');

      expect(result.data.isFollowing).toBe(false);
    });
  });

  describe('GET /users/:userId/social-stats', () => {
    it('should return follower and following counts', async () => {
      const userId = 'user-1';
      mockFollowService.getSocialStats.mockResolvedValue({
        followers: 100,
        following: 50,
      });

      const result = await controller.getSocialStats(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ followers: 100, following: 50 });
    });
  });
});
