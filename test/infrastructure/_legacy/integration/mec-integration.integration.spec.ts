/**
 * MEC Integration Tests
 *
 * Tests MEC (Ministerio da Educacao) public API endpoints.
 * These endpoints are public and do not require authentication.
 *
 * Note: Tests depend on MEC data being synced/seeded.
 * Tests skip gracefully if no MEC data is available.
 *
 * Endpoints tested:
 * - GET /api/v1/mec/ufs - List states
 * - GET /api/v1/mec/areas - Knowledge areas
 * - GET /api/v1/mec/institutions/search?q=... - Search institutions
 * - GET /api/v1/mec/courses/search?q=... - Search courses
 * - GET /api/v1/mec/stats - MEC statistics
 */

import { beforeAll, describe, expect, it } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getApp } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('MEC Integration', () => {
  let app: INestApplication;
  let hasMecData = false;

  beforeAll(async () => {
    app = await getApp();

    // Check if MEC data exists by fetching stats
    const statsRes = await request(app.getHttpServer()).get('/api/v1/mec/stats');
    if (statsRes.status === 200 && statsRes.body.data?.stats) {
      const stats = statsRes.body.data.stats;
      hasMecData = (stats.totalInstitutions > 0 || stats.totalCourses > 0) ?? false;
    }
  }, 15000);

  // ── MEC Statistics ─────────────────────────────────────────────────

  describe('GET /api/v1/mec/stats', () => {
    it('should return MEC statistics', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/mec/stats').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();

      const stats = res.body.data.stats;
      expect(typeof stats.totalInstitutions).toBe('number');
      expect(typeof stats.totalCourses).toBe('number');
      expect(stats.totalInstitutions).toBeGreaterThanOrEqual(0);
      expect(stats.totalCourses).toBeGreaterThanOrEqual(0);
    });
  });

  // ── UFs (States) ───────────────────────────────────────────────────

  describe('GET /api/v1/mec/ufs', () => {
    it('should return list of Brazilian states', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/mec/ufs').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.states).toBeDefined();

      if (hasMecData) {
        const states = res.body.data.states;
        expect(Array.isArray(states)).toBe(true);
        expect(states.length).toBeGreaterThan(0);

        // Brazilian states are 2-letter codes
        for (const state of states) {
          if (typeof state === 'string') {
            expect(state.length).toBe(2);
          }
        }
      }
    });
  });

  // ── Knowledge Areas ────────────────────────────────────────────────

  describe('GET /api/v1/mec/areas', () => {
    it('should return knowledge areas', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/mec/areas').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.areas).toBeDefined();

      if (hasMecData) {
        expect(Array.isArray(res.body.data.areas)).toBe(true);
        expect(res.body.data.areas.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Institution Search ─────────────────────────────────────────────

  describe('GET /api/v1/mec/institutions/search', () => {
    it('should search institutions by name', async () => {
      if (!hasMecData) {
        console.warn('Skipping: no MEC data available');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/institutions/search?q=universidade')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.institutions)).toBe(true);
    });

    it('should search with special characters (Sao Paulo)', async () => {
      if (!hasMecData) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/mec/institutions/search?q=${encodeURIComponent('São Paulo')}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.institutions)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      if (!hasMecData) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/institutions/search?q=faculdade&limit=3')
        .expect(200);

      expect(res.body.data.institutions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty results for nonsense query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/institutions/search?q=zzzznonexistent12345')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.institutions).toEqual([]);
    });

    it('should handle empty search query', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/mec/institutions/search?q=');

      // Should return 200 with empty results or 400
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ── Institutions List ──────────────────────────────────────────────

  describe('GET /api/v1/mec/institutions', () => {
    it('should list institutions (no filter)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/mec/institutions').expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.institutions)).toBe(true);
    });

    it('should filter institutions by state (UF)', async () => {
      if (!hasMecData) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/institutions?uf=SP')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.institutions)).toBe(true);
    });
  });

  // ── Course Search ──────────────────────────────────────────────────

  describe('GET /api/v1/mec/courses/search', () => {
    it('should search courses by name', async () => {
      if (!hasMecData) {
        console.warn('Skipping: no MEC data available');
        return;
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/courses/search?q=engenharia')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.courses)).toBe(true);
    });

    it('should search with accented characters', async () => {
      if (!hasMecData) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/mec/courses/search?q=${encodeURIComponent('ciência')}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.courses)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      if (!hasMecData) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/courses/search?q=administracao&limit=2')
        .expect(200);

      expect(res.body.data.courses.length).toBeLessThanOrEqual(2);
    });

    it('should return empty results for no matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/mec/courses/search?q=xyznonexistent98765')
        .expect(200);

      expect(res.body.data.courses).toEqual([]);
    });

    it('should reject invalid limit (non-positive)', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/mec/courses/search?q=test&limit=0',
      );

      expect(res.status).toBe(400);
    });

    it('should reject non-numeric limit', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/mec/courses/search?q=test&limit=abc',
      );

      expect(res.status).toBe(400);
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('should handle very long search query', async () => {
      const longQuery = 'a'.repeat(500);
      const res = await request(app.getHttpServer()).get(
        `/api/v1/mec/institutions/search?q=${longQuery}`,
      );

      // Should not crash - either 200 with empty results or 400
      expect([200, 400]).toContain(res.status);
    });

    it('should handle SQL injection attempt in search', async () => {
      const sqlInjection = "'; DROP TABLE mec_institution; --";
      const res = await request(app.getHttpServer()).get(
        `/api/v1/mec/institutions/search?q=${encodeURIComponent(sqlInjection)}`,
      );

      // Should be safe - Prisma uses parameterized queries
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });
});
