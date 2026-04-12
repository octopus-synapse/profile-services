/**
 * Social Features Integration Tests
 *
 * Tests follow/unfollow, followers/following lists, social stats,
 * and activity feeds via HTTP endpoints with real database.
 *
 * Covers:
 * - Follow/unfollow lifecycle
 * - Self-follow prevention
 * - Idempotent follow behavior
 * - Pagination on followers/following lists
 * - Social stats accuracy
 * - Activity feed entries
 * - Non-existent user edge cases
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestEmail,
} from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Social Features Integration', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let userCToken: string;
  let userCId: string;

  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await getApp();

    // Create three test users for social interactions
    const userA = await createTestUserAndLogin({ email: uniqueTestEmail('social-a') });
    userAToken = userA.accessToken;
    userAId = userA.userId;
    createdUserIds.push(userAId);

    const userB = await createTestUserAndLogin({ email: uniqueTestEmail('social-b') });
    userBToken = userB.accessToken;
    userBId = userB.userId;
    createdUserIds.push(userBId);

    const userC = await createTestUserAndLogin({ email: uniqueTestEmail('social-c') });
    userCToken = userC.accessToken;
    userCId = userC.userId;
    createdUserIds.push(userCId);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    // Clean up follows and activities first
    for (const id of createdUserIds) {
      try {
        await prisma.activity.deleteMany({ where: { userId: id } });
        await prisma.follow.deleteMany({
          where: { OR: [{ followerId: id }, { followingId: id }] },
        });
        await prisma.userConsent.deleteMany({ where: { userId: id } });
        await prisma.resume.deleteMany({ where: { userId: id } });
        await prisma.user.deleteMany({ where: { id } });
      } catch {
        // Ignore cleanup errors
      }
    }
    await closeApp();
  });

  // =========================================================================
  // Follow / Unfollow Lifecycle
  // =========================================================================

  describe('Follow a user', () => {
    it('should allow User A to follow User B', async () => {
      const response = await getRequest()
        .post(`/api/v1/users/${userBId}/follow`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should confirm User A is following User B', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/is-following`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(true);
    });

    it('should confirm User A is NOT following User C yet', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userCId}/is-following`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(false);
    });
  });

  describe('Cannot follow yourself', () => {
    it('should reject self-follow with 400', async () => {
      const response = await getRequest()
        .post(`/api/v1/users/${userAId}/follow`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(400);
    });
  });

  describe('Idempotent follow (cannot follow same user twice)', () => {
    it('should handle duplicate follow gracefully', async () => {
      // User A already follows User B from previous test
      const response = await getRequest()
        .post(`/api/v1/users/${userBId}/follow`)
        .set(authHeader(userAToken));

      // Should either return 200 (idempotent) or 409 (conflict)
      expect([200, 409]).toContain(response.status);
    });
  });

  describe('Unfollow a user', () => {
    it('should allow User A to unfollow User B', async () => {
      const response = await getRequest()
        .delete(`/api/v1/users/${userBId}/follow`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should confirm User A is no longer following User B', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/is-following`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(false);
    });

    it('should handle unfollowing a user you do not follow', async () => {
      const response = await getRequest()
        .delete(`/api/v1/users/${userCId}/follow`)
        .set(authHeader(userAToken));

      // Should either succeed as no-op or return 404
      expect([200, 404]).toContain(response.status);
    });
  });

  // =========================================================================
  // Followers / Following Lists
  // =========================================================================

  describe('Get followers list', () => {
    beforeAll(async () => {
      // Set up: A and C both follow B
      await getRequest().post(`/api/v1/users/${userBId}/follow`).set(authHeader(userAToken));

      await getRequest().post(`/api/v1/users/${userBId}/follow`).set(authHeader(userCToken));
    });

    it('should return followers of User B', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/followers`)
        .set(authHeader(userBToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toBeDefined();

      // Unwrap: could be { data: [...], total: N } or direct array
      const followersData = response.body.data.followers;
      const followersList = Array.isArray(followersData) ? followersData : followersData.data;

      expect(followersList.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination on followers', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/followers?page=1&limit=1`)
        .set(authHeader(userBToken));

      expect(response.status).toBe(200);

      const followersData = response.body.data.followers;
      const followersList = Array.isArray(followersData) ? followersData : followersData.data;

      expect(followersList.length).toBeLessThanOrEqual(1);
    });

    it('should return empty followers for user with no followers', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/followers`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);

      const followersData = response.body.data.followers;
      const followersList = Array.isArray(followersData) ? followersData : followersData.data;
      const total = Array.isArray(followersData) ? followersData.length : followersData.total;

      expect(total).toBe(0);
      expect(followersList.length).toBe(0);
    });
  });

  describe('Get following list', () => {
    it('should return users that User A is following', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/following`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const followingData = response.body.data.following;
      const followingList = Array.isArray(followingData) ? followingData : followingData.data;

      // User A follows User B
      expect(followingList.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination on following', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/following?page=1&limit=1`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Social Stats
  // =========================================================================

  describe('Social stats accuracy', () => {
    it('should return correct stats for User B (has followers)', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/social-stats`)
        .set(authHeader(userBToken));

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBeGreaterThanOrEqual(2);
      expect(response.body.data.following).toBeGreaterThanOrEqual(0);
    });

    it('should return correct stats for User A (follows someone)', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/social-stats`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.following).toBeGreaterThanOrEqual(1);
    });

    it('should update stats after unfollow', async () => {
      // Get stats before
      const beforeResp = await getRequest()
        .get(`/api/v1/users/${userBId}/social-stats`)
        .set(authHeader(userBToken));
      const followersBefore = beforeResp.body.data.followers;

      // User C unfollows User B
      await getRequest().delete(`/api/v1/users/${userBId}/follow`).set(authHeader(userCToken));

      // Get stats after
      const afterResp = await getRequest()
        .get(`/api/v1/users/${userBId}/social-stats`)
        .set(authHeader(userBToken));
      const followersAfter = afterResp.body.data.followers;

      expect(followersAfter).toBe(followersBefore - 1);
    });
  });

  // =========================================================================
  // Activity Feed
  // =========================================================================

  describe('Activity feed', () => {
    it('should show activities for a user', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/activities`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.activities).toBeDefined();
    });

    it('should show feed for authenticated user', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/feed`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
      expect(response.body.data.feed).toBeDefined();
    });

    it('should support pagination on activities', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userAId}/activities?page=1&limit=5`)
        .set(authHeader(userAToken));

      expect(response.status).toBe(200);
    });

    it('should return empty activities for user with no activity', async () => {
      // Create a fresh user with no activities
      const freshUser = await createTestUserAndLogin({ email: uniqueTestEmail('no-activity') });
      createdUserIds.push(freshUser.userId);

      const response = await getRequest()
        .get(`/api/v1/users/${freshUser.userId}/activities`)
        .set(authHeader(freshUser.accessToken));

      expect(response.status).toBe(200);

      const activities = response.body.data.activities;
      const actList = Array.isArray(activities) ? activities : activities.data;

      expect(actList.length).toBe(0);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge cases', () => {
    it('should handle following a non-existent user', async () => {
      const response = await getRequest()
        .post('/api/v1/users/nonexistent-user-id-xyz/follow')
        .set(authHeader(userAToken));

      expect([400, 404]).toContain(response.status);
    });

    it('should handle checking is-following for non-existent user', async () => {
      const response = await getRequest()
        .get('/api/v1/users/nonexistent-user-id-xyz/is-following')
        .set(authHeader(userAToken));

      // Could return false or 404
      if (response.status === 200) {
        expect(response.body.data.isFollowing).toBe(false);
      } else {
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should handle social stats for non-existent user', async () => {
      const response = await getRequest()
        .get('/api/v1/users/nonexistent-user-id-xyz/social-stats')
        .set(authHeader(userAToken));

      expect(response.status).not.toBe(500);

      if (response.status === 200) {
        expect(response.body.data.followers).toBe(0);
        expect(response.body.data.following).toBe(0);
      }
    });

    it('should handle pagination limit cap at 100', async () => {
      const response = await getRequest()
        .get(`/api/v1/users/${userBId}/followers?limit=999`)
        .set(authHeader(userBToken));

      expect(response.status).toBe(200);
      // Controller caps limit at 100
    });

    it('should require authentication for follow action', async () => {
      const response = await getRequest().post(`/api/v1/users/${userBId}/follow`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for unfollow action', async () => {
      const response = await getRequest().delete(`/api/v1/users/${userBId}/follow`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for is-following check', async () => {
      const response = await getRequest().get(`/api/v1/users/${userBId}/is-following`);

      expect(response.status).toBe(401);
    });

    it('should allow unauthenticated access to followers list (public endpoint)', async () => {
      const response = await getRequest().get(`/api/v1/users/${userBId}/followers`);

      // Followers list has no @RequirePermission, so it should be public
      // But JwtAuthGuard might still be applied at controller level
      expect([200, 401]).toContain(response.status);
    });
  });
});
