/**
 * Theme ATS Scoring Integration Tests
 *
 * Tests the GET /v1/ats/themes/:themeId/score endpoint
 * against a real NestJS application with real database.
 *
 * Uses whatever themes exist in the database (seeded or created).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
} from './setup';

describe('Theme ATS Scoring Integration', () => {
  let accessToken: string;
  let systemThemeIds: string[];

  beforeAll(async () => {
    await getApp();
    const credentials = await createTestUserAndLogin();
    accessToken = credentials.accessToken;

    const prisma = getPrisma();
    const themes = await prisma.resumeTheme.findMany({
      where: { isSystemTheme: true },
      select: { id: true },
      take: 3,
    });
    systemThemeIds = themes.map((t) => t.id);
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await getRequest().get('/api/v1/ats/themes/any-theme/score');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/any-theme/score')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent theme', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/non-existent-theme-id/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(404);
    });
  });

  describe('System Theme Scoring', () => {
    it('should return score breakdown for a system theme', async () => {
      if (systemThemeIds.length === 0) {
        console.warn('Skipping: no system themes found');
        return;
      }

      const themeId = systemThemeIds[0];
      const response = await getRequest()
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.themeId).toBe(themeId);
      expect(typeof data.overallScore).toBe('number');
      expect(data.overallScore).toBeGreaterThanOrEqual(0);
      expect(data.overallScore).toBeLessThanOrEqual(100);
      expect(typeof data.isATSFriendly).toBe('boolean');
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.breakdown).toBeDefined();

      for (const criterion of Object.values(data.breakdown) as Array<{
        score: number;
        maxScore: number;
        details: string;
      }>) {
        expect(typeof criterion.score).toBe('number');
        expect(typeof criterion.maxScore).toBe('number');
        expect(typeof criterion.details).toBe('string');
      }
    });

    it('should score all available system themes', async () => {
      for (const themeId of systemThemeIds) {
        const response = await getRequest()
          .get(`/api/v1/ats/themes/${themeId}/score`)
          .set(authHeader(accessToken));

        expect(response.status).toBe(200);
        expect(response.body.data.themeId).toBe(themeId);
      }
    });
  });

  describe('ATS-Friendly Flag', () => {
    it('should set isATSFriendly based on score threshold', async () => {
      if (systemThemeIds.length === 0) return;

      const response = await getRequest()
        .get(`/api/v1/ats/themes/${systemThemeIds[0]}/score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      const { overallScore, isATSFriendly } = response.body.data;

      if (overallScore >= 80) {
        expect(isATSFriendly).toBe(true);
      } else {
        expect(isATSFriendly).toBe(false);
      }
    });
  });

  describe('Score Consistency', () => {
    it('should return consistent scores across multiple calls', async () => {
      if (systemThemeIds.length === 0) return;

      const themeId = systemThemeIds[0];

      const response1 = await getRequest()
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set(authHeader(accessToken));

      const response2 = await getRequest()
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set(authHeader(accessToken));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.overallScore).toBe(response2.body.data.overallScore);
    });
  });

  describe('Recommendations', () => {
    it('should include recommendations array in response', async () => {
      if (systemThemeIds.length === 0) return;

      const response = await getRequest()
        .get(`/api/v1/ats/themes/${systemThemeIds[0]}/score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
  });

  describe('Custom Theme Scoring', () => {
    it('should score a custom theme with known ATS issues', async () => {
      const prisma = getPrisma();

      const user = await prisma.user.findFirst({
        where: { emailVerified: { not: null } },
        orderBy: { createdAt: 'desc' },
      });

      if (!user) {
        console.warn('Skipping: no verified user found');
        return;
      }

      const customTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Integration Test Theme',
          description: 'Theme for ATS scoring integration test',
          version: '1.0.0',
          authorId: user.id,
          isSystemTheme: false,
          status: 'PUBLISHED',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'two-column', paperSize: 'a4', margins: 'tight' },
            tokens: {
              typography: { fontFamily: { heading: 'inter', body: 'roboto' } },
              colors: {
                colors: { primary: '#3B82F6', text: { primary: '#1E293B' }, background: '#FFFFFF' },
                borderRadius: 'lg',
                shadows: 'subtle',
              },
              spacing: { density: 'compact' },
            },
            sections: [
              { id: 'header', visible: true, order: 0, column: 'full-width' },
              { id: 'skill_set_v1', visible: true, order: 1, column: 'sidebar' },
            ],
          },
        },
      });

      try {
        const response = await getRequest()
          .get(`/api/v1/ats/themes/${customTheme.id}/score`)
          .set(authHeader(accessToken));

        expect(response.status).toBe(200);
        expect(response.body.data.themeId).toBe(customTheme.id);
        expect(typeof response.body.data.overallScore).toBe('number');
        expect(response.body.data.breakdown.layout.score).toBeLessThan(25);
      } finally {
        await prisma.resumeTheme.delete({ where: { id: customTheme.id } });
      }
    });
  });
});
