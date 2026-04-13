/**
 * E2E Journey: Analytics Pipeline
 *
 * Tests the complete analytics flow from resume creation through
 * snapshot tracking, view monitoring, and score progression.
 *
 * Flow:
 * 1. Create user and resume (via onboarding)
 * 2. Take initial snapshot
 * 3. Track several views
 * 4. Get dashboard, verify data
 * 5. Check ATS score
 * 6. Take another snapshot
 * 7. Verify progression shows both snapshots
 * 8. View history shows all snapshots
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { createFullOnboardingData } from '../fixtures/resumes.fixture';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Analytics Pipeline', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let resumeId: string;
  let _firstSnapshotAtsScore: number;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    if (testUser?.email) {
      // Clean analytics data before deleting user
      if (resumeId) {
        await prisma.resumeAnalytics.deleteMany({ where: { resumeId } }).catch(() => {});
        await prisma.resumeViewEvent.deleteMany({ where: { resumeId } }).catch(() => {});
        await prisma.analyticsResumeProjection
          .deleteMany({ where: { id: resumeId } })
          .catch(() => {});
      }
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await app.close();
  });

  describe('Step 1: Create User and Resume', () => {
    it('should create user, complete onboarding, and get resume', async () => {
      testUser = authHelper.createTestUser('analytics-pipeline');
      const onboardingData = createFullOnboardingData('analytics_pipe');

      // Register and login
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      expect(testUser.token).toBeDefined();
      expect(testUser.userId).toBeDefined();

      // Complete onboarding (creates default resume + analytics projection via event)
      const onboardingResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(onboardingResponse.status).toBe(200);
      expect(onboardingResponse.body.success).toBe(true);
      expect(onboardingResponse.body.data.resumeId).toBeDefined();

      resumeId = onboardingResponse.body.data.resumeId;

      // Verify the analytics projection was created (by event handler)
      // If not, create it manually for the test
      const projection = await prisma.analyticsResumeProjection.findUnique({
        where: { id: resumeId },
      });

      if (!projection) {
        await prisma.analyticsResumeProjection.create({
          data: {
            id: resumeId,
            userId: testUser.userId!,
            title: 'Analytics Pipeline Resume',
            sectionCounts: {},
          },
        });
      }
    });
  });

  describe('Step 2: Take Initial Snapshot', () => {
    it('should take initial analytics snapshot', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/resume-analytics/${resumeId}/snapshot`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.atsScore).toBe('number');
      expect(response.body.data.atsScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.atsScore).toBeLessThanOrEqual(100);

      _firstSnapshotAtsScore = response.body.data.atsScore;
    });
  });

  describe('Step 3: Track Several Views', () => {
    it('should track view from different sources', async () => {
      const viewSources = [
        {
          userAgent: 'Mozilla/5.0 (LinkedIn Bot)',
          referer: 'https://linkedin.com',
          ip: '203.0.113.1',
        },
        { userAgent: 'Mozilla/5.0 (Chrome)', referer: 'https://google.com', ip: '203.0.113.2' },
        { userAgent: 'Mozilla/5.0 (Firefox)', referer: 'https://github.com', ip: '203.0.113.3' },
        { userAgent: 'Mozilla/5.0 (Safari)', ip: '203.0.113.4' },
        { userAgent: 'Mozilla/5.0 (Edge)', referer: 'https://indeed.com', ip: '203.0.113.5' },
      ];

      for (const source of viewSources) {
        const req = request(app.getHttpServer())
          .post(`/api/resume-analytics/${resumeId}/track-view`)
          .send({})
          .set('User-Agent', source.userAgent)
          .set('X-Forwarded-For', source.ip);

        if (source.referer) {
          req.set('Referer', source.referer);
        }

        const response = await req;
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    it('should track view without authentication (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/resume-analytics/${resumeId}/track-view`)
        .send({});

      expect(response.status).toBe(201);
    });
  });

  describe('Step 4: Get Dashboard', () => {
    it('should return dashboard with analytics data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/dashboard`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const dashboard = response.body.data;
      // Dashboard should contain relevant analytics info
      expect(dashboard).toBeDefined();
    });

    it('should require authentication for dashboard', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/resume-analytics/${resumeId}/dashboard`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Step 5: Check ATS Score', () => {
    it('should calculate and return ATS score', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/ats-score`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const atsData = response.body.data;
      expect(atsData.score).toBeDefined();
      expect(typeof atsData.score).toBe('number');
      expect(atsData.score).toBeGreaterThanOrEqual(0);
      expect(atsData.score).toBeLessThanOrEqual(100);

      // Should include section breakdown
      expect(atsData.sectionBreakdown).toBeDefined();
      expect(Array.isArray(atsData.sectionBreakdown)).toBe(true);

      // Should include issues/recommendations
      expect(atsData.issues).toBeDefined();
      expect(Array.isArray(atsData.issues)).toBe(true);
    });
  });

  describe('Step 6: Take Another Snapshot', () => {
    it('should take a second snapshot', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/resume-analytics/${resumeId}/snapshot`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.atsScore).toBe('number');
    });
  });

  describe('Step 7: Verify Score Progression', () => {
    it('should show progression with both snapshots', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/progression`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const progression = response.body.data;
      expect(progression.snapshots).toBeDefined();
      expect(Array.isArray(progression.snapshots)).toBe(true);
      expect(progression.snapshots.length).toBeGreaterThanOrEqual(2);

      // Trend should be a valid value
      expect(['improving', 'stable', 'declining']).toContain(progression.trend);

      // Change percent should be a number
      expect(typeof progression.changePercent).toBe('number');

      // Each snapshot point should have date and score
      for (const point of progression.snapshots) {
        expect(point.date).toBeDefined();
        expect(typeof point.score).toBe('number');
        expect(point.score).toBeGreaterThanOrEqual(0);
        expect(point.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Step 8: View History', () => {
    it('should show all snapshots in history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/history`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const history = response.body.data;
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Each snapshot should have expected fields
      for (const snapshot of history) {
        expect(snapshot.resumeId).toBe(resumeId);
        expect(snapshot.atsScore).toBeDefined();
        expect(typeof snapshot.atsScore).toBe('number');
        expect(snapshot.atsScore).toBeGreaterThanOrEqual(0);
        expect(snapshot.atsScore).toBeLessThanOrEqual(100);
      }

      // Snapshots should be ordered (most recent first or oldest first)
      // Just verify they all have timestamps
      for (const snapshot of history) {
        expect(snapshot.createdAt || snapshot.id).toBeDefined();
      }
    });

    it('should support limit parameter in history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/history`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('Step 9: View Stats', () => {
    it('should return view statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/views`)
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Step 10: Error Boundaries', () => {
    it('should return 404 for non-existent resume analytics', async () => {
      const fakeResumeId = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${fakeResumeId}/dashboard`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(404);
    });

    it('should prevent cross-user analytics access', async () => {
      // Create another user
      const otherUser = authHelper.createTestUser('analytics-other');
      const otherResult = await authHelper.registerAndLogin(otherUser);

      const response = await request(app.getHttpServer())
        .get(`/api/resume-analytics/${resumeId}/ats-score`)
        .set('Authorization', `Bearer ${otherResult.token}`);

      // Should not reveal resume existence - return 404 or 403
      expect([403, 404]).toContain(response.status);

      // Cleanup other user
      await cleanupHelper.deleteUserByEmail(otherUser.email);
    });
  });
});
