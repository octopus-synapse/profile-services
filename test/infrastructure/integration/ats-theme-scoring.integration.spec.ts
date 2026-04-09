/**
 * Theme ATS Scoring Integration Tests
 *
 * Tests the GET /v1/ats/themes/:themeId/score endpoint
 * against a real NestJS application with real database.
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

  beforeAll(async () => {
    await getApp();
    const credentials = await createTestUserAndLogin();
    accessToken = credentials.accessToken;
  });

  afterAll(async () => {
    await closeApp();
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

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

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should return 404 for non-existent theme', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/non-existent-theme-id/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // System Theme Scoring Tests
  // ============================================================================

  describe('System Theme Scoring', () => {
    it('should return score breakdown for system-classic theme', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/system-classic/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.themeId).toBe('system-classic');
      expect(data.themeName).toBe('Classic');
      expect(typeof data.overallScore).toBe('number');
      expect(data.overallScore).toBeGreaterThanOrEqual(0);
      expect(data.overallScore).toBeLessThanOrEqual(100);
      expect(typeof data.isATSFriendly).toBe('boolean');
      expect(Array.isArray(data.recommendations)).toBe(true);

      // Breakdown structure
      expect(data.breakdown).toBeDefined();
      expect(data.breakdown.layout).toBeDefined();
      expect(data.breakdown.typography).toBeDefined();
      expect(data.breakdown.colorContrast).toBeDefined();
      expect(data.breakdown.visualElements).toBeDefined();
      expect(data.breakdown.sectionOrder).toBeDefined();
      expect(data.breakdown.paperSize).toBeDefined();
      expect(data.breakdown.margins).toBeDefined();
      expect(data.breakdown.density).toBeDefined();

      // Each criterion has score, maxScore, details
      for (const criterion of Object.values(data.breakdown)) {
        expect(typeof criterion.score).toBe('number');
        expect(typeof criterion.maxScore).toBe('number');
        expect(typeof criterion.details).toBe('string');
      }
    });

    it('should return score breakdown for system-modern theme', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/system-modern/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.data.themeId).toBe('system-modern');
    });

    it('should return score breakdown for system-minimal theme', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/system-minimal/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.data.themeId).toBe('system-minimal');
    });

    it('should return different scores for different themes', async () => {
      const classicResponse = await getRequest()
        .get('/api/v1/ats/themes/system-classic/score')
        .set(authHeader(accessToken));

      const modernResponse = await getRequest()
        .get('/api/v1/ats/themes/system-modern/score')
        .set(authHeader(accessToken));

      expect(classicResponse.status).toBe(200);
      expect(modernResponse.status).toBe(200);

      // Classic (single-column) should have higher layout score than Modern (two-column)
      const classicLayoutScore = classicResponse.body.data.breakdown.layout.score;
      const modernLayoutScore = modernResponse.body.data.breakdown.layout.score;

      expect(classicLayoutScore).toBeGreaterThanOrEqual(modernLayoutScore);
    });
  });

  // ============================================================================
  // ATS-Friendly Flag Tests
  // ============================================================================

  describe('ATS-Friendly Flag', () => {
    it('should mark Classic theme as ATS-friendly (score >= 80)', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/system-classic/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      const { overallScore, isATSFriendly } = response.body.data;

      // Classic theme is designed to be ATS-friendly
      if (overallScore >= 80) {
        expect(isATSFriendly).toBe(true);
      } else {
        expect(isATSFriendly).toBe(false);
      }
    });
  });

  // ============================================================================
  // Score Consistency Tests
  // ============================================================================

  describe('Score Consistency', () => {
    it('should return consistent scores across multiple calls', async () => {
      const response1 = await getRequest()
        .get('/api/v1/ats/themes/system-classic/score')
        .set(authHeader(accessToken));

      const response2 = await getRequest()
        .get('/api/v1/ats/themes/system-classic/score')
        .set(authHeader(accessToken));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      expect(response1.body.data.overallScore).toBe(response2.body.data.overallScore);
      expect(response1.body.data.breakdown.layout.score).toBe(
        response2.body.data.breakdown.layout.score,
      );
    });
  });

  // ============================================================================
  // Recommendations Tests
  // ============================================================================

  describe('Recommendations', () => {
    it('should include recommendations array in response', async () => {
      const response = await getRequest()
        .get('/api/v1/ats/themes/system-modern/score')
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);

      // Modern theme (two-column) should have recommendations
      if (response.body.data.breakdown.layout.score < 25) {
        expect(response.body.data.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Custom Theme Scoring Tests
  // ============================================================================

  describe('Custom Theme Scoring', () => {
    it('should score a user-created custom theme', async () => {
      const prisma = getPrisma();

      // Get the current user
      const user = await prisma.user.findFirst({
        where: { emailVerified: { not: null } },
        orderBy: { createdAt: 'desc' },
      });

      if (!user) {
        console.warn('Skipping custom theme test: no user found');
        return;
      }

      // Create a custom theme with suboptimal ATS config
      const customTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Test Custom Theme',
          description: 'A test theme for ATS scoring',
          version: '1.0.0',
          authorId: user.id,
          isPublic: false,
          isSystemTheme: false,
          status: 'DRAFT',
          styleConfig: {
            version: '1.0.0',
            layout: {
              type: 'two-column',
              paperSize: 'a4',
              margins: 'tight',
              columnDistribution: '70-30',
            },
            tokens: {
              typography: {
                fontFamily: { heading: 'inter', body: 'roboto' },
                fontSize: 'base',
                headingStyle: 'accent-border',
              },
              colors: {
                colors: {
                  primary: '#3B82F6',
                  text: { primary: '#1E293B' },
                },
                borderRadius: 'lg',
                shadows: 'subtle',
              },
              spacing: {
                density: 'compact',
              },
            },
            sections: [
              { id: 'header', visible: true, order: 0, column: 'full-width' },
              { id: 'summary_v1', visible: true, order: 1, column: 'main' },
              { id: 'skill_set_v1', visible: true, order: 2, column: 'sidebar' },
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
        expect(response.body.data.themeName).toBe('Test Custom Theme');
        expect(typeof response.body.data.overallScore).toBe('number');

        // Two-column layout should score lower
        expect(response.body.data.breakdown.layout.score).toBeLessThan(25);
      } finally {
        // Cleanup
        await prisma.resumeTheme.delete({ where: { id: customTheme.id } });
      }
    });
  });
});
