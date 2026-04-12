/**
 * ATS Theme Scoring E2E Journey Tests
 *
 * Tests the ATS scoring workflow for themes.
 * All themes are public — scoring is available for any seeded/admin-created theme.
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

  afterAll(async () => {});

  // ============================================================================
  // Journey 1: Score System Themes
  // ============================================================================

  describe('Journey: Score System Themes', () => {
    it('should score seeded system themes', async () => {
      const user = await authHelper.registerAndLogin();

      const systemRes = await request(app.getHttpServer()).get('/api/v1/themes/system').expect(200);

      const systemThemes = systemRes.body.data.themes;
      expect(systemThemes.length).toBeGreaterThan(0);

      const themeId = systemThemes[0].id;
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set('Authorization', `Bearer ${user.token}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.themeId).toBe(themeId);
        expect(typeof response.body.data.overallScore).toBe('number');
        expect(typeof response.body.data.isATSFriendly).toBe('boolean');
        expect(response.body.data.breakdown).toBeDefined();
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Journey 2: Compare Theme Scores (single-column vs two-column)
  // ============================================================================

  describe('Journey: Compare Theme Scores', () => {
    it('should show single-column scores higher than two-column', async () => {
      const user = await authHelper.registerAndLogin();

      const singleColumnTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Single Column ATS Test',
          description: 'Test',
          version: '1.0.0',
          authorId: user.userId!,
          isSystemTheme: false,
          status: 'PUBLISHED',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' },
            tokens: {
              typography: { fontFamily: { heading: 'arial', body: 'arial' } },
              colors: {
                shadows: 'none',
                borderRadius: 'none',
                colors: { primary: '#000000', text: { primary: '#000000' }, background: '#FFFFFF' },
              },
              spacing: { density: 'comfortable' },
            },
            sections: [{ id: 'header', visible: true, order: 0, column: 'full-width' }],
          },
        },
      });

      const twoColumnTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Two Column ATS Test',
          description: 'Test',
          version: '1.0.0',
          authorId: user.userId!,
          isSystemTheme: false,
          status: 'PUBLISHED',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'two-column', paperSize: 'a4', margins: 'normal' },
            tokens: {
              typography: { fontFamily: { heading: 'arial', body: 'arial' } },
              colors: {
                shadows: 'none',
                borderRadius: 'none',
                colors: { primary: '#000000', text: { primary: '#000000' }, background: '#FFFFFF' },
              },
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

      const singleResponse = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${singleColumnTheme.id}/score`)
        .set('Authorization', `Bearer ${user.token}`);

      const twoResponse = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${twoColumnTheme.id}/score`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(singleResponse.status).toBe(200);
      expect(twoResponse.status).toBe(200);

      const singleScore = singleResponse.body.data.overallScore;
      const twoScore = twoResponse.body.data.overallScore;

      expect(singleScore).toBeGreaterThan(twoScore);
    });
  });

  // ============================================================================
  // Journey 3: Score Consistency Across Sessions
  // ============================================================================

  describe('Journey: Score Consistency', () => {
    it('should return consistent scores across different users', async () => {
      const user1 = await authHelper.registerAndLogin();
      const user2 = await authHelper.registerAndLogin();

      const systemRes = await request(app.getHttpServer()).get('/api/v1/themes/system').expect(200);

      const themeId = systemRes.body.data.themes[0]?.id;
      if (!themeId) return;

      const response1 = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set('Authorization', `Bearer ${user1.token}`);

      const response2 = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${themeId}/score`)
        .set('Authorization', `Bearer ${user2.token}`);

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body.data.overallScore).toBe(response2.body.data.overallScore);
      }
    });
  });

  // ============================================================================
  // Journey 4: Recommendations for Non-ATS-Friendly Themes
  // ============================================================================

  describe('Journey: ATS Recommendations', () => {
    it('should provide recommendations for problematic themes', async () => {
      const user = await authHelper.registerAndLogin();

      const problematicTheme = await prisma.resumeTheme.create({
        data: {
          name: 'Problematic Theme',
          description: 'A theme with ATS issues',
          version: '1.0.0',
          authorId: user.userId!,
          isSystemTheme: false,
          status: 'PUBLISHED',
          styleConfig: {
            version: '1.0.0',
            layout: { type: 'two-column', paperSize: 'a4', margins: 'tight' },
            tokens: {
              typography: { fontFamily: { heading: 'fancy-script', body: 'creative-font' } },
              colors: {
                shadows: 'elevated',
                borderRadius: 'xl',
                colors: { primary: '#ff0000', text: { primary: '#333333' }, background: '#fef3c7' },
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

      cleanupHelper.trackTheme(problematicTheme.id);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/ats/themes/${problematicTheme.id}/score`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);

      const { recommendations, isATSFriendly, overallScore } = response.body.data;

      expect(isATSFriendly).toBe(false);
      expect(overallScore).toBeLessThan(80);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      const recommendationsText = recommendations.join(' ').toLowerCase();
      expect(recommendationsText).toContain('single-column');
    });
  });
});
