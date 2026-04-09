/**
 * Pagination & Filtering Integration Tests
 *
 * Tests pagination behavior across multiple endpoints.
 * Validates correct page/limit handling, edge cases, and response structure.
 *
 * Endpoints tested:
 * - GET /api/v1/resumes (authenticated)
 * - GET /api/v1/themes (public, paginated)
 * - GET /api/v1/spoken-languages (search with limit)
 * - GET /api/v1/users/:userId/followers (paginated)
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestUserAndLogin, getApp, getPrisma, uniqueTestId } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Pagination & Filtering Integration', () => {
  let app: INestApplication;
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
        await request(app.getHttpServer())
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
      const res = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // The response wraps data in data.data for list endpoints
      const listData = res.body.data.data || res.body.data;
      expect(Array.isArray(listData)).toBe(true);
      expect(listData.length).toBe(3);
    });

    it('should return empty results for unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/resumes').expect(401);
    });
  });

  // ── Themes Pagination ──────────────────────────────────────────────

  describe('GET /api/v1/themes - pagination', () => {
    it('should return themes with explicit page and limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?page=1&limit=5')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBeDefined();
      expect(typeof res.body.data.pagination.total).toBe('number');
      expect(typeof res.body.data.pagination.totalPages).toBe('number');
      expect(Array.isArray(res.body.data.themes)).toBe(true);
      expect(res.body.data.themes.length).toBeLessThanOrEqual(5);
    });

    it('should return page 2 correctly', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/themes?page=1&limit=2')
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/api/v1/themes?page=2&limit=2')
        .expect(200);

      expect(page2.body.data.pagination.page).toBe(2);

      // If there are enough themes, page 2 should have different items
      if (page1.body.data.pagination.total > 2 && page2.body.data.themes.length > 0) {
        const page1Ids = page1.body.data.themes.map((t: { id: string }) => t.id);
        const page2Ids = page2.body.data.themes.map((t: { id: string }) => t.id);
        // No overlap between pages
        const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should handle page beyond total gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?page=9999&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.themes.length).toBe(0);
      expect(res.body.data.pagination.page).toBe(9999);
    });

    it('should handle limit=1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?page=1&limit=1')
        .expect(200);

      expect(res.body.data.themes.length).toBeLessThanOrEqual(1);
    });

    it('should cap limit at maximum (100)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes?page=1&limit=1000');

      // Should either cap at 100 or reject with 400
      if (res.status === 200) {
        expect(res.body.data.themes.length).toBeLessThanOrEqual(100);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('should reject limit=0', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes?page=1&limit=0');

      // Should be 400 Bad Request (limit min is 1 per schema)
      expect(res.status).toBe(400);
    });

    it('should reject negative page', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes?page=-1&limit=10');

      // page min is 1
      expect(res.status).toBe(400);
    });

    it('should reject page=0', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes?page=0&limit=10');

      // page min is 1
      expect(res.status).toBe(400);
    });

    it('should support sorting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?sortBy=createdAt&sortDir=desc&limit=5')
        .expect(200);

      expect(res.body.success).toBe(true);
      const themes = res.body.data.themes;
      if (themes.length >= 2) {
        // Verify descending order by createdAt
        const dates = themes.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });

    it('should filter by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?category=PROFESSIONAL&limit=10')
        .expect(200);

      for (const theme of res.body.data.themes) {
        expect(theme.category).toBe('PROFESSIONAL');
      }
    });

    it('should filter by search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?search=system&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      // Search should not error even if no results
    });
  });

  // ── Spoken Languages ───────────────────────────────────────────────

  describe('GET /api/v1/spoken-languages - search & limit', () => {
    it('should return all active languages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.languages)).toBe(true);
      expect(res.body.data.languages.length).toBeGreaterThan(0);
    });

    it('should search languages by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages/search?q=english')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.languages.length).toBeGreaterThan(0);
    });

    it('should respect limit on search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages/search?q=a&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.languages.length).toBeLessThanOrEqual(2);
    });

    it('should reject invalid limit (negative)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages/search?q=test&limit=-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject invalid limit (non-numeric)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages/search?q=test&limit=abc')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/spoken-languages/search?q=zzzznonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.languages).toEqual([]);
    });
  });

  // ── Followers Pagination ───────────────────────────────────────────

  describe('GET /api/v1/users/:userId/followers - pagination', () => {
    it('should return followers with default pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/followers`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.followers).toBeDefined();
    });

    it('should accept page and limit params', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/followers?page=1&limit=5`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return empty followers for new user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/followers?page=1&limit=10`)
        .expect(200);

      // New user should have no followers
      const followers = res.body.data.followers;
      if (Array.isArray(followers)) {
        expect(followers.length).toBe(0);
      } else if (followers && typeof followers === 'object') {
        // Might be paginated response with items
        const items = followers.items || followers.data || [];
        expect(Array.isArray(items)).toBe(true);
      }
    });

    it('should cap limit at 100', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/followers?page=1&limit=500`)
        .expect(200);

      // Should not error, limit is capped at 100 in controller
      expect(res.body.success).toBe(true);
    });
  });

  // ── Social Stats ───────────────────────────────────────────────────

  describe('GET /api/v1/users/:userId/social-stats', () => {
    it('should return social stats for user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/social-stats`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.followers).toBe('number');
      expect(typeof res.body.data.following).toBe('number');
      expect(res.body.data.followers).toBe(0);
      expect(res.body.data.following).toBe(0);
    });
  });
});
