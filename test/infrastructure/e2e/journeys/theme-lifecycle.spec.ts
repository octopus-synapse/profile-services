/**
 * E2E Journey: Theme Lifecycle
 *
 * Tests the theme lifecycle with public, admin-managed themes.
 *
 * Flow:
 * 1. Setup test user with resume
 * 2. List system themes (seeded)
 * 3. Get theme details
 * 4. Apply system theme to resume
 * 5. List and filter themes
 *
 * Target Time: < 15 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Theme Lifecycle', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let systemThemeId: string;
  let resumeId: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
  });

  afterAll(async () => {
    try {
      if (testUser?.email) {
        await cleanupHelper.deleteUserByEmail(testUser.email);
      }
    } catch {
      // Ignore cleanup errors
    }
    await app.close();
  });

  // ── Step 1: Account Setup ──────────────────────────────────────────

  describe('Step 1: Setup test user', () => {
    it('should create and authenticate a new user', async () => {
      testUser = authHelper.createTestUser('theme-lifecycle');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      expect(testUser.token).toBeDefined();
      expect(testUser.userId).toBeDefined();
    });

    it('should create a resume for theme application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Theme Lifecycle Resume',
          fullName: 'Theme Test User',
          jobTitle: 'Designer',
        })
        .expect(201);

      resumeId = res.body.data.id;
      expect(resumeId).toBeDefined();
    });
  });

  // ── Step 2: List System Themes ─────────────────────────────────────

  describe('Step 2: System themes', () => {
    it('should list seeded system themes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes/system').expect(200);

      expect(res.body.success).toBe(true);
      const themes = res.body.data.themes;
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);

      for (const theme of themes) {
        expect(theme.isSystemTheme).toBe(true);
      }

      systemThemeId = themes[0].id;
    });

    it('should get a system theme by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/themes/${systemThemeId}`)
        .expect(200);

      expect(res.body.data.theme.id).toBe(systemThemeId);
      expect(res.body.data.theme.isSystemTheme).toBe(true);
      expect(res.body.data.theme.styleConfig).toBeDefined();
    });
  });

  // ── Step 3: Apply Theme to Resume ──────────────────────────────────

  describe('Step 3: Apply theme to resume', () => {
    it('should apply system theme to resume', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/themes/apply')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          resumeId,
          themeId: systemThemeId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should apply a different system theme', async () => {
      const systemRes = await request(app.getHttpServer()).get('/api/v1/themes/system').expect(200);
      const themes = systemRes.body.data.themes;

      if (themes.length > 1) {
        const secondThemeId = themes[1].id;

        const res = await request(app.getHttpServer())
          .post('/api/v1/themes/apply')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({
            resumeId,
            themeId: secondThemeId,
          });

        expect(res.status).toBe(200);
      }
    });
  });

  // ── Step 4: Public Listing & Filtering ─────────────────────────────

  describe('Step 4: Public theme listing', () => {
    it('should list all themes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.themes.length).toBeGreaterThanOrEqual(0);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter themes by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?category=PROFESSIONAL&page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const theme of res.body.data.themes) {
        expect(theme.category).toBe('PROFESSIONAL');
      }
    });

    it('should search themes by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/themes?search=classic&page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return popular themes', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/themes/popular').expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.themes)).toBe(true);
    });
  });
});
