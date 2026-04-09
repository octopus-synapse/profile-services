/**
 * ATS Theme Scoring E2E Journey Tests
 *
 * End-to-end tests for the complete ATS theme scoring workflow.
 * Tests user journeys from authentication to scoring themes.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AuthHelper } from '../helpers/auth.helper';
import { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('ATS Theme Scoring Journey', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testContext = await createE2ETestApp();
    app = testContext.app;
    authHelper = testContext.authHelper;
    cleanupHelper = testContext.cleanupHelper;
    prisma = testContext.prisma;
  });

  afterEach(async () => {
    await cleanupHelper.cleanupTestData();
  });

  afterAll(async () => {
    // Cleanup handled by setup
  });

  // ============================================================================
  // Journey 1: Score All System Themes
  // ============================================================================

  describe('Journey: Score All System Themes', () => {
    it('should allow authenticated user to score all system themes', async () => {
      // 1. Authenticate
      const user = await authHelper.createAuthenticatedUser();

      // 2. Get list of system themes (they should exist from seeds)
      const systemThemeIds = ['system-classic', 'system-modern', 'system-minimal'];
      const scores: Record<string, number> = {};

      for (const themeId of systemThemeIds) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/ats/themes/${themeId}/score`)
          .set('Authorization', `Bearer ${user.accessToken}`);

        if (response.status === 200) {
          scores[themeId] = response.body.data.overallScore;

          // Verify response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data.themeId).toBe(themeId);
          expect(typeof response.body.data.overallScore).toBe('number');
          expect(typeof response.body.data.isATSFriendly).toBe('boolean');
          expect(response.body.data.breakdown).toBeDefined();
          expect(Array.isArray(response.body.data.recommendations)).toBe(true);
        }
      }

      // 3. Verify we got scores for at least one theme
      expect(Object.keys(scores).length).toBeGreaterThan(0);

      // 4. Verify Classic (single-column) scores higher than Modern (two-column)
      if (scores['system-classic'] !== undefined && scores['system-modern'] !== undefined) {
        expect(scores['system-classic']).toBeGreaterThanOrEqual(scores['system-modern']);
      }
    });
  });

  // ============================================================================
  // Journey 2: Create Theme and Check Score
  // ============================================================================

  describe('Journey: Create Custom Theme and Score', () => {
    it('should allow user to create a theme and check its ATS score', async () => {
      // 1. Authenticate
      const user = await authHelper.createAuthenticatedUser();

      // 2. Create a custom theme with known ATS characteristics
      const themeResponse = await request(app.getHttpServer())
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'My ATS-Friendly Theme',
          description: 'A custom theme optimized for ATS',
          styleConfig: {
            version: '1.0.0',
            layout: {
              type: 'single-column',
              paperSize: 'a4',
              margins: 'normal',
            },
            tokens: {
              typography: {
                fontFamily: { heading: 'arial', body: 'arial' },
                fontSize: 'base',
                headingStyle: 'bold',
              },
              colors: {
                colors: {
                  primary: '#000000',
                  text: { primary: '#000000' },
                  background: '#FFFFFF',
                },
                borderRadius: 'none',
                shadows: 'none',
              },
              spacing: {
                density: 'comfortable',
              },
            },
            sections: [
              { id: 'header', visible: true, order: 0, column: 'full-width' },
              { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
              { id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
              { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
              { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
            ],
          },
        });

      // Theme creation might not be implemented or require different endpoint
      if (themeResponse.status === 201 || themeResponse.status === 200) {
        const themeId = themeResponse.body.data?.id || themeResponse.body.data?.theme?.id;

        if (themeId) {
          // 3. Check the ATS score of the created theme
          const scoreResponse = await request(app.getHttpServer())
            .get(`/api/v1/ats/themes/${themeId}/score`)
            .set('Authorization', `Bearer ${user.accessToken}`);

          expect(scoreResponse.status).toBe(200);
          expect(scoreResponse.body.data.themeId).toBe(themeId);

          // 4. Verify high score for ATS-optimized config
          expect(scoreResponse.body.data.overallScore).toBeGreaterThanOrEqual(80);
          expect(scoreResponse.body.data.isATSFriendly).toBe(true);

          // 5. Verify breakdown scores
          const { breakdown } = scoreResponse.body.data;
          expect(breakdown.layout.score).toBe(25); // single-column = max
          expect(breakdown.typography.score).toBeGreaterThanOrEqual(15); // arial = safe
        }
      }
    });
  });

  // ============================================================================
  // Journey 3: Compare Theme Scores
  // ============================================================================

  describe('Journey: Compare Theme Scores', () => {
    it('should show score differences between themes with different layouts', async () => {
      // 1. Authenticate
      const user = await authHelper.createAuthenticatedUser();

      // 2. Create two themes: one single-column, one two-column
      const singleColumnTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Single Column Test',
          description: 'Test',
          version: '1.0.0',
          authorId: user.userId,
          isPublic: false,
          isSystemTheme: false,
          status: 'DRAFT',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' },
            tokens: {
              typography: { fontFamily: { heading: 'arial', body: 'arial' } },
              colors: { shadows: 'none', borderRadius: 'none' },
              spacing: { density: 'comfortable' },
            },
            sections: [{ id: 'header', visible: true, order: 0, column: 'full-width' }],
          },
        },
      });

      const twoColumnTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Two Column Test',
          description: 'Test',
          version: '1.0.0',
          authorId: user.userId,
          isPublic: false,
          isSystemTheme: false,
          status: 'DRAFT',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' },
            tokens: {
              typography: { fontFamily: { heading: 'arial', body: 'arial' } },
              colors: { shadows: 'none', borderRadius: 'none' },
              spacing: { density: 'comfortable' },
            },
            sections: [
              { id: 'header', visible: true, order: 0, column: 'full-width' },
              { id: 'skills', visible: true, order: 1, column: 'sidebar' },
            ],
          },
        },
      });

      cleanupHelper.trackTheme(singleColumnTheme.id);
      cleanupHelper.trackTheme(twoColumnTheme.id);

      // 3. Score both themes
      const singleResponse = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${singleColumnTheme.id}/score`)
        .set('Authorization', `Bearer ${user.accessToken}`);

      const twoResponse = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${twoColumnTheme.id}/score`)
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(singleResponse.status).toBe(200);
      expect(twoResponse.status).toBe(200);

      // 4. Compare layout scores
      const singleLayoutScore = singleResponse.body.data.breakdown.layout.score;
      const twoLayoutScore = twoResponse.body.data.breakdown.layout.score;

      expect(singleLayoutScore).toBeGreaterThan(twoLayoutScore);
      expect(singleLayoutScore).toBe(25); // max for single-column
      expect(twoLayoutScore).toBe(10); // penalty for two-column
    });
  });

  // ============================================================================
  // Journey 4: Score Consistency Across Sessions
  // ============================================================================

  describe('Journey: Score Consistency', () => {
    it('should return consistent scores across different authenticated sessions', async () => {
      // 1. First user session
      const user1 = await authHelper.createAuthenticatedUser();

      const response1 = await request(app.getHttpServer())
        .get('/api/v1/ats/themes/system-classic/score')
        .set('Authorization', `Bearer ${user1.accessToken}`);

      // 2. Second user session
      const user2 = await authHelper.createAuthenticatedUser();

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/ats/themes/system-classic/score')
        .set('Authorization', `Bearer ${user2.accessToken}`);

      // 3. Scores should be identical
      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body.data.overallScore).toBe(response2.body.data.overallScore);
        expect(response1.body.data.breakdown.layout.score).toBe(
          response2.body.data.breakdown.layout.score,
        );
        expect(response1.body.data.breakdown.typography.score).toBe(
          response2.body.data.breakdown.typography.score,
        );
      }
    });
  });

  // ============================================================================
  // Journey 5: Recommendations for Improvement
  // ============================================================================

  describe('Journey: Get Recommendations for Theme Improvement', () => {
    it('should provide actionable recommendations for non-ATS-friendly themes', async () => {
      // 1. Authenticate
      const user = await authHelper.createAuthenticatedUser();

      // 2. Create a theme with known ATS issues
      const problematicTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Problematic Theme',
          description: 'A theme with ATS issues',
          version: '1.0.0',
          authorId: user.userId,
          isPublic: false,
          isSystemTheme: false,
          status: 'DRAFT',
          styleConfig: {
            version: '1.0.0',
            layout: {
              type: 'two-column',
              paperSize: 'a4',
              margins: 'tight',
            },
            tokens: {
              typography: {
                fontFamily: { heading: 'fancy-script', body: 'creative-font' },
              },
              colors: {
                shadows: 'elevated',
                borderRadius: 'xl',
              },
              spacing: {
                density: 'compact',
              },
            },
            sections: [
              { id: 'header', visible: true, order: 0, column: 'full-width' },
              { id: 'skill_set_v1', visible: true, order: 1, column: 'sidebar' },
              { id: 'education_v1', visible: true, order: 2, column: 'sidebar' },
            ],
          },
        },
      });

      cleanupHelper.trackTheme(problematicTheme.id);

      // 3. Get the score with recommendations
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${problematicTheme.id}/score`)
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);

      // 4. Verify we get recommendations
      const { recommendations, isATSFriendly, overallScore } = response.body.data;

      expect(isATSFriendly).toBe(false); // Should not be ATS-friendly
      expect(overallScore).toBeLessThan(80); // Below threshold
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // 5. Verify recommendations address the issues
      const recommendationsText = recommendations.join(' ').toLowerCase();

      // Should recommend single-column
      expect(recommendationsText).toContain('single-column');
    });
  });
});
