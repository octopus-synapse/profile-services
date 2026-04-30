/**
 * E2E Journey: Social Features
 *
 * Tests the complete social interaction flow:
 * 1. User A follows User B
 * 2. Verify follower/following lists are correct
 * 3. Social stats update correctly
 * 4. User A unfollows User B
 * 5. Verify counts decrement
 * 6. Feed shows activity history
 * 7. Multiple follow/unfollow cycles
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Social Features', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaClient;

  let userA: { email: string; password: string; name: string; token?: string; userId?: string };
  let userB: { email: string; password: string; name: string; token?: string; userId?: string };
  let userC: { email: string; password: string; name: string; token?: string; userId?: string };

  const cleanupEmails: string[] = [];

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    // Clean up follows and activities before deleting users
    for (const email of cleanupEmails) {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (user) {
          await prisma.activity.deleteMany({ where: { userId: user.id } });
          await prisma.follow.deleteMany({
            where: { OR: [{ followerId: user.id }, { followingId: user.id }] },
          });
        }
        await cleanupHelper.deleteUserByEmail(email);
      } catch {
        // Ignore cleanup errors
      }
    }
    await stopTestApp();
  });

  // =========================================================================
  // Step 1: Create users
  // =========================================================================

  describe('Step 1: User setup', () => {
    it.serial('should create User A', async () => {
      userA = authHelper.createTestUser('social-a');
      const result = await authHelper.registerAndLogin(userA);
      userA.token = result.token;
      userA.userId = result.userId;
      cleanupEmails.push(userA.email);

      expect(userA.token).toBeDefined();
      expect(userA.userId).toBeDefined();
    });

    it.serial('should create User B', async () => {
      userB = authHelper.createTestUser('social-b');
      const result = await authHelper.registerAndLogin(userB);
      userB.token = result.token;
      userB.userId = result.userId;
      cleanupEmails.push(userB.email);

      expect(userB.token).toBeDefined();
    });

    it.serial('should create User C', async () => {
      userC = authHelper.createTestUser('social-c');
      const result = await authHelper.registerAndLogin(userC);
      userC.token = result.token;
      userC.userId = result.userId;
      cleanupEmails.push(userC.email);

      expect(userC.token).toBeDefined();
    });
  });

  // =========================================================================
  // Step 2: Initial state - no followers
  // =========================================================================

  describe('Step 2: Initial social state', () => {
    it.serial('should show zero social stats for User B', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBe(0);
      expect(response.body.data.following).toBe(0);
    });

    it.serial('should show User A is NOT following User B', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/is-following`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(false);
    });
  });

  // =========================================================================
  // Step 3: User A follows User B
  // =========================================================================

  describe('Step 3: User A follows User B', () => {
    it.serial('should successfully follow User B', async () => {
      const response = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it.serial('should confirm the follow relationship', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/is-following`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(true);
    });

    it.serial('should prevent self-follow', async () => {
      const response = await app.request
        .post(`/api/v1/users/${userA.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // Step 4: Verify follower/following lists
  // =========================================================================

  describe('Step 4: Verify lists', () => {
    it.serial('should show User A in User B followers', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/followers`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);

      const followersData = response.body.data.followers;
      const followersList = Array.isArray(followersData) ? followersData : followersData.data;

      expect(followersList.length).toBeGreaterThanOrEqual(1);
    });

    it.serial('should show User B in User A following list', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/following`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);

      const followingData = response.body.data.following;
      const followingList = Array.isArray(followingData) ? followingData : followingData.data;

      expect(followingList.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Step 5: Social stats update
  // =========================================================================

  describe('Step 5: Social stats after follow', () => {
    it.serial('should show 1 follower for User B', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBe(1);
    });

    it.serial('should show 1 following for User A', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/social-stats`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.following).toBe(1);
    });
  });

  // =========================================================================
  // Step 6: User C also follows User B
  // =========================================================================

  describe('Step 6: User C follows User B', () => {
    it.serial('should allow User C to follow User B', async () => {
      const response = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userC.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it.serial('should show 2 followers for User B now', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBe(2);
    });

    it.serial('should handle duplicate follow gracefully', async () => {
      const response = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userC.token}`);

      // Idempotent or conflict
      expect([200, 409]).toContain(response.status);

      // Stats should not change
      const statsResp = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(statsResp.body.data.followers).toBe(2);
    });
  });

  // =========================================================================
  // Step 7: User A unfollows User B
  // =========================================================================

  describe('Step 7: User A unfollows User B', () => {
    it.serial('should successfully unfollow', async () => {
      const response = await app.request
        .delete(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it.serial('should confirm User A no longer follows User B', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/is-following`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(false);
    });

    it.serial('should show decremented follower count for User B', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBe(1);
    });

    it.serial('should show decremented following count for User A', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/social-stats`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.following).toBe(0);
    });
  });

  // =========================================================================
  // Step 8: Activity feed
  // =========================================================================

  describe('Step 8: Activity feed', () => {
    it.serial('should show activity history for User A', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/activities`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activities).toBeDefined();
    });

    it.serial('should show activity history for User C', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userC.userId}/activities`)
        .set('Authorization', `Bearer ${userC.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activities).toBeDefined();
    });

    it.serial('should show feed for User B (shows activities from followed users)', async () => {
      // User B follows User A to get a feed
      await app.request
        .post(`/api/v1/users/${userA.userId}/follow`)
        .set('Authorization', `Bearer ${userB.token}`);

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/feed`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.feed).toBeDefined();
    });

    it.serial('should support pagination on feed', async () => {
      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/feed?page=1&limit=5`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.feed).toBeDefined();
    });
  });

  // =========================================================================
  // Step 9: Edge cases and error handling
  // =========================================================================

  describe('Step 9: Edge cases', () => {
    it.serial('should reject follow without authentication', async () => {
      const response = await app.request.post(`/api/v1/users/${userB.userId}/follow`);

      expect(response.status).toBe(401);
    });

    it.serial('should handle following non-existent user', async () => {
      const response = await app.request
        .post('/api/v1/users/non-existent-user-000/follow')
        .set('Authorization', `Bearer ${userA.token}`);

      expect([400, 404]).toContain(response.status);
    });

    it.serial('should handle unfollowing a user you do not follow', async () => {
      // User A already unfollowed User B
      const response = await app.request
        .delete(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Should be idempotent or 404
      expect([200, 404]).toContain(response.status);
    });

    it.serial('should handle social stats for user with no activity', async () => {
      const freshUser = authHelper.createTestUser('fresh-social');
      const result = await authHelper.registerAndLogin(freshUser);
      cleanupEmails.push(freshUser.email);

      const response = await app.request
        .get(`/api/v1/users/${result.userId}/social-stats`)
        .set('Authorization', `Bearer ${result.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.followers).toBe(0);
      expect(response.body.data.following).toBe(0);
    });

    it.serial('should handle re-following after unfollow', async () => {
      // User A re-follows User B
      const followResp = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(followResp.status).toBe(200);

      // Verify stats updated
      const statsResp = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(statsResp.body.data.followers).toBe(2); // C + A again

      // Clean up: unfollow
      await app.request
        .delete(`/api/v1/users/${userB.userId}/follow`)
        .set('Authorization', `Bearer ${userA.token}`);
    });
  });
});
