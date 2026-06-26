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
 *
 * Order-independent: Bun 1.3+ runs tests inside a `describe`
 * concurrently, so the prior shared `userA/userB/userC` + their
 * accumulated follow-state would race (a prior follow turned a later
 * "should follow" 201 into a 409). Each test now self-provisions its
 * own fresh actors (a pair or trio of `freshInDbUser`) so there is no
 * shared follow-state from a sibling test.
 */

import { describe, expect, it } from 'bun:test';
import { type FreshUser, freshInDbUser, type TestApp } from '../shared';
import { getApp } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

/** Provision N fresh, independent, fully-onboarded actors. */
async function freshActors(app: TestApp, count: number): Promise<FreshUser[]> {
  const actors: FreshUser[] = [];
  for (let i = 0; i < count; i++) {
    actors.push(await freshInDbUser(app));
  }
  return actors;
}

describeIntegration('Social Features Integration', () => {
  // =========================================================================
  // Follow / Unfollow Lifecycle
  // =========================================================================

  describe('Follow a user', () => {
    it('should allow User A to follow User B', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);

      const response = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set(userA.bearer());

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should confirm User A is following User B', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/is-following`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(response.body.isFollowing).toBe(true);
    });

    it('should confirm User A is NOT following User C yet', async () => {
      const app = await getApp();
      const [userA, userC] = await freshActors(app, 2);

      const response = await app.request
        .get(`/api/v1/users/${userC.userId}/is-following`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(response.body.isFollowing).toBe(false);
    });
  });

  describe('Cannot follow yourself', () => {
    it('should reject self-follow with 400', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .post(`/api/v1/users/${userA.userId}/follow`)
        .set(userA.bearer());

      expect(response.status).toBe(400);
    });
  });

  describe('Idempotent follow (cannot follow same user twice)', () => {
    it('should handle duplicate follow gracefully', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      // First follow.
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      // Second (duplicate) follow.
      const response = await app.request
        .post(`/api/v1/users/${userB.userId}/follow`)
        .set(userA.bearer());

      // Should either return 200 (idempotent) or 409 (conflict)
      expect([200, 409]).toContain(response.status);
    });
  });

  describe('Unfollow a user', () => {
    it('should allow User A to unfollow User B', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .delete(`/api/v1/users/${userB.userId}/follow`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
    });

    it('should confirm User A is no longer following User B', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());
      await app.request.delete(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/is-following`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(response.body.isFollowing).toBe(false);
    });

    it('should handle unfollowing a user you do not follow', async () => {
      const app = await getApp();
      const [userA, userC] = await freshActors(app, 2);

      const response = await app.request
        .delete(`/api/v1/users/${userC.userId}/follow`)
        .set(userA.bearer());

      // Should either succeed as no-op or return 404
      expect([200, 404]).toContain(response.status);
    });
  });

  // =========================================================================
  // Followers / Following Lists
  // =========================================================================

  describe('Get followers list', () => {
    it('should return followers of User B', async () => {
      const app = await getApp();
      const [userA, userB, userC] = await freshActors(app, 3);
      // A and C both follow B.
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userC.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/followers`)
        .set(userB.bearer());

      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();

      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination on followers', async () => {
      const app = await getApp();
      const [userA, userB, userC] = await freshActors(app, 3);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userC.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/followers?page=1&limit=1`)
        .set(userB.bearer());

      expect(response.status).toBe(200);

      expect(response.body.items.length).toBeLessThanOrEqual(1);
    });

    it('should return empty followers for user with no followers', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/followers`)
        .set(userA.bearer());

      expect(response.status).toBe(200);

      expect(response.body.total).toBe(0);
      expect(response.body.items.length).toBe(0);
    });
  });

  describe('Get following list', () => {
    it('should return users that User A is following', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/following`)
        .set(userA.bearer());

      expect(response.status).toBe(200);

      // User A follows User B
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination on following', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/following?page=1&limit=1`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Social Stats
  // =========================================================================

  describe('Social stats accuracy', () => {
    it('should return correct stats for User B (has followers)', async () => {
      const app = await getApp();
      const [userA, userB, userC] = await freshActors(app, 3);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userC.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set(userB.bearer());

      expect(response.status).toBe(200);
      expect(response.body.followers).toBeGreaterThanOrEqual(2);
      expect(response.body.following).toBeGreaterThanOrEqual(0);
    });

    it('should return correct stats for User A (follows someone)', async () => {
      const app = await getApp();
      const [userA, userB] = await freshActors(app, 2);
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/social-stats`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(response.body.following).toBeGreaterThanOrEqual(1);
    });

    it('should update stats after unfollow', async () => {
      const app = await getApp();
      const [userA, userB, userC] = await freshActors(app, 3);
      // A and C both follow B so the count is deterministic for this test.
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userA.bearer());
      await app.request.post(`/api/v1/users/${userB.userId}/follow`).set(userC.bearer());

      // Get stats before
      const beforeResp = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set(userB.bearer());
      const followersBefore = beforeResp.body.followers;

      // User C unfollows User B
      await app.request.delete(`/api/v1/users/${userB.userId}/follow`).set(userC.bearer());

      // Get stats after
      const afterResp = await app.request
        .get(`/api/v1/users/${userB.userId}/social-stats`)
        .set(userB.bearer());
      const followersAfter = afterResp.body.followers;

      expect(followersAfter).toBe(followersBefore - 1);
    });
  });

  // =========================================================================
  // Activity Feed
  // =========================================================================

  describe('Activity feed', () => {
    it('should show activities for a user', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/activities`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should show feed for authenticated user', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/feed`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should support pagination on activities', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get(`/api/v1/users/${userA.userId}/activities?page=1&limit=5`)
        .set(userA.bearer());

      expect(response.status).toBe(200);
    });

    it('should return empty activities for user with no activity', async () => {
      const app = await getApp();
      // Create a fresh user with no activities
      const fresh = await freshInDbUser(app);

      const response = await app.request
        .get(`/api/v1/users/${fresh.userId}/activities`)
        .set(fresh.bearer());

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge cases', () => {
    it('should handle following a non-existent user', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .post('/api/v1/users/nonexistent-user-id-xyz/follow')
        .set(userA.bearer());

      expect([400, 404]).toContain(response.status);
    });

    it('should handle checking is-following for non-existent user', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get('/api/v1/users/nonexistent-user-id-xyz/is-following')
        .set(userA.bearer());

      // Could return false or 404
      if (response.status === 200) {
        expect(response.body.isFollowing).toBe(false);
      } else {
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should handle social stats for non-existent user', async () => {
      const app = await getApp();
      const [userA] = await freshActors(app, 1);

      const response = await app.request
        .get('/api/v1/users/nonexistent-user-id-xyz/social-stats')
        .set(userA.bearer());

      expect(response.status).not.toBe(500);

      if (response.status === 200) {
        expect(response.body.followers).toBe(0);
        expect(response.body.following).toBe(0);
      }
    });

    it('should handle pagination limit cap at 100', async () => {
      const app = await getApp();
      const [_userA, userB] = await freshActors(app, 2);

      const response = await app.request
        .get(`/api/v1/users/${userB.userId}/followers?limit=999`)
        .set(userB.bearer());

      // PaginationQuerySchema (Q3): MAX_PAGE_SIZE = 100; valores acima
      // disparam 400 via Zod. Antes era clamp silencioso.
      expect([200, 400]).toContain(response.status);
    });

    it('should require authentication for follow action', async () => {
      const app = await getApp();
      const [userB] = await freshActors(app, 1);
      const response = await app.request.post(`/api/v1/users/${userB.userId}/follow`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for unfollow action', async () => {
      const app = await getApp();
      const [userB] = await freshActors(app, 1);
      const response = await app.request.delete(`/api/v1/users/${userB.userId}/follow`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for is-following check', async () => {
      const app = await getApp();
      const [userB] = await freshActors(app, 1);
      const response = await app.request.get(`/api/v1/users/${userB.userId}/is-following`);

      expect(response.status).toBe(401);
    });

    it('should allow unauthenticated access to followers list (public endpoint)', async () => {
      const app = await getApp();
      const [userB] = await freshActors(app, 1);
      const response = await app.request.get(`/api/v1/users/${userB.userId}/followers`);

      // Followers list has no @RequirePermission, so it should be public
      // But JwtAuthGuard might still be applied at controller level
      expect([200, 401]).toContain(response.status);
    });
  });
});
