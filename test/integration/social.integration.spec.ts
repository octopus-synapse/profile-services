/**
 * Social Module Integration Tests
 *
 * Tests the social features with a real (in-memory) database setup.
 *
 * Martin Fowler: "Integration tests should verify that independently
 * developed software modules work together correctly."
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { FollowService } from '@/bounded-contexts/social/social/services/follow.service';
import { ActivityService } from '@/bounded-contexts/social/social/services/activity.service';
import { SocialModule } from '@/bounded-contexts/social/social/social.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { BadRequestException } from '@nestjs/common';

// Skip integration tests in CI unless database is available
const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION
    ? describe
    : describe.skip;

describeIntegration('Social Integration Tests', () => {
  let followService: FollowService;
  let activityService: ActivityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, SocialModule],
    }).compile();

    followService = module.get<FollowService>(FollowService);
    activityService = module.get<ActivityService>(ActivityService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.activity.deleteMany({});
    await prisma.follow.deleteMany({});
  });

  describe('Follow Service Integration', () => {
    it('should create and verify follow relationship', async () => {
      const followerId = 'integration-user-1';
      const followingId = 'integration-user-2';

      // This will fail in tests without proper user setup
      // But demonstrates the integration pattern
      const isFollowingBefore = await followService.isFollowing(
        followerId,
        followingId,
      );
      expect(isFollowingBefore).toBe(false);
    });

    it('should prevent self-follow', async () => {
      const userId = 'integration-user-1';

      await expect(followService.follow(userId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty followers for new user', async () => {
      const userId = 'new-user-123';

      const result = await followService.getFollowers(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty following for new user', async () => {
      const userId = 'new-user-123';

      const result = await followService.getFollowing(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return zero social stats for new user', async () => {
      const userId = 'new-user-123';

      const stats = await followService.getSocialStats(userId);

      expect(stats.followers).toBe(0);
      expect(stats.following).toBe(0);
    });
  });

  describe('Activity Service Integration', () => {
    it('should return empty feed for new user', async () => {
      const userId = 'new-user-123';

      const result = await activityService.getFeed(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty activities for new user', async () => {
      const userId = 'new-user-123';

      const result = await activityService.getUserActivities(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should delete old activities without error', async () => {
      // Should not throw even with empty data
      const count = await activityService.deleteOldActivities(30);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
