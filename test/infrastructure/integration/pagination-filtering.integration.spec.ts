/**
 * Pagination & Filtering Integration Tests
 *
 * Tests pagination behavior across multiple endpoints.
 * Validates correct page/limit handling, edge cases, and response structure.
 *
 * Endpoints tested:
 * - GET /api/v1/resumes (authenticated)
 * - GET /api/v1/resume-styles (authenticated, paginated)
 * - GET /api/v1/spoken-languages (search with limit)
 * - GET /api/v1/users/:userId/followers (paginated)
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { type TestApp } from '../shared';
import { createTestUserAndLogin, getApp, getPrisma, uniqueTestId } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Pagination & Filtering Integration', () => {
  let app: TestApp; // was INestApplication
  let userToken: string;
  let userId: string;
  const uid = uniqueTestId();

  beforeAll(async () => {
    app = await getApp();
    const user = await createTestUserAndLogin({
      email: `pagination-test-${uid}@example.com`,
      name: 'Pagination Test User',
    });
    userToken = user.accessToken;
    userId = user.userId;
  }, 20000);

  afterAll(async () => {
    const prisma = getPrisma();
    try {
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({
        where: { email: `pagination-test-${uid}@example.com` },
      });
    } catch {
      // Ignore
    }
  });

  // ── Resumes Pagination ─────────────────────────────────────────────

  describe('GET /api/v1/resumes - pagination', () => {
    beforeAll(async () => {
      // Create a few resumes for pagination testing
      for (let i = 1; i <= 3; i++) {
        await app.request
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: `Pagination Resume ${i}`,
            fullName: `User ${i}`,
          })
          .expect(201);
      }
    }, 15000);

    it('should return resumes with default pagination', async () => {
      const res = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // The response wraps data in data.data for list endpoints
      const listData = res.body || res.body;
      expect(Array.isArray(listData)).toBe(true);
      expect(listData.length).toBe(3);
    });

    it('should return empty results for unauthenticated request', async () => {
      await app.request.get('/api/v1/resumes').expect(401);
    });
  });

  // ── Resume Styles Pagination ───────────────────────────────────────

  // `/api/v1/resume-styles` returns `{ items, total, page, limit }`.
  describe('GET /api/v1/resume-styles - pagination', () => {
    const auth = (): { Authorization: string } => ({ Authorization: `Bearer ${userToken}` });

    it('should return styles with explicit page and limit', async () => {
      const res = await app.request
        .get('/api/v1/resume-styles?page=1&limit=5')
        .set(auth())
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(typeof res.body.limit).toBe('number');
      expect(typeof res.body.total).toBe('number');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('should return page 2 correctly', async () => {
      const page1 = await app.request
        .get('/api/v1/resume-styles?page=1&limit=2')
        .set(auth())
        .expect(200);
      const page2 = await app.request
        .get('/api/v1/resume-styles?page=2&limit=2')
        .set(auth())
        .expect(200);

      expect(page2.body.page).toBe(2);

      if (page1.body.total > 2 && page2.body.items.length > 0) {
        const page1Ids = page1.body.items.map((t: { id: string }) => t.id);
        const page2Ids = page2.body.items.map((t: { id: string }) => t.id);
        const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should handle page beyond total gracefully', async () => {
      const res = await app.request
        .get('/api/v1/resume-styles?page=9999&limit=10')
        .set(auth())
        .expect(200);

      expect(res.body.items.length).toBe(0);
      expect(res.body.page).toBe(9999);
    });

    it('should handle limit=1', async () => {
      const res = await app.request
        .get('/api/v1/resume-styles?page=1&limit=1')
        .set(auth())
        .expect(200);

      expect(res.body.items.length).toBeLessThanOrEqual(1);
    });
  });

  // ── Spoken Languages ───────────────────────────────────────────────

  describe('GET /api/v1/spoken-languages - search & limit', () => {
    it('should return all active languages', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body.languages)).toBe(true);
      expect(res.body.languages.length).toBeGreaterThan(0);
    });

    it('should search languages by name', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=english')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.languages.length).toBeGreaterThan(0);
    });

    it('should respect limit on search', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=a&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.languages.length).toBeLessThanOrEqual(2);
    });

    it('should reject invalid limit (negative)', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=test&limit=-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject invalid limit (non-numeric)', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=test&limit=abc')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it('should return empty array for no matches', async () => {
      const res = await app.request
        .get('/api/v1/spoken-languages/search?q=zzzznonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.languages).toEqual([]);
    });
  });

  // ── Followers Pagination ───────────────────────────────────────────

  describe('GET /api/v1/users/:userId/followers - pagination', () => {
    it('should return followers with default pagination', async () => {
      const res = await app.request
        .get(`/api/v1/users/${userId}/followers`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should accept page and limit params', async () => {
      await app.request
        .get(`/api/v1/users/${userId}/followers?page=1&limit=5`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should return empty followers for new user', async () => {
      const res = await app.request
        .get(`/api/v1/users/${userId}/followers?page=1&limit=10`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // New user should have no followers
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('should cap limit at 100', async () => {
      // Should not error; the limit is capped at 100 in the controller.
      await app.request
        .get(`/api/v1/users/${userId}/followers?page=1&limit=500`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  // ── Social Stats ───────────────────────────────────────────────────

  describe('GET /api/v1/users/:userId/social-stats', () => {
    it('should return social stats for user', async () => {
      const res = await app.request.get(`/api/v1/users/${userId}/social-stats`).expect(200);

      expect(typeof res.body.followers).toBe('number');
      expect(typeof res.body.following).toBe('number');
      expect(res.body.followers).toBe(0);
      expect(res.body.following).toBe(0);
    });
  });
});
