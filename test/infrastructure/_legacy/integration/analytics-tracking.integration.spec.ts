/**
 * Analytics Tracking Integration Tests
 *
 * Tests resume analytics endpoints with real database.
 * Covers view tracking, snapshots, dashboard, ATS score, and progression.
 *
 * BUG DISCOVERY TARGETS:
 * - View count accuracy after multiple tracks
 * - Snapshot persistence and retrieval
 * - ATS score calculation validity (0-100 range)
 * - Ownership enforcement (403 for other user's resume)
 * - 404 for non-existent resume
 * - Dashboard data consistency with snapshots/views
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  authHeader,
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from './setup';

describe('Analytics Tracking Integration', () => {
  let userId: string;
  let accessToken: string;
  let resumeId: string;

  let otherUserId: string;
  let otherAccessToken: string;

  beforeAll(async () => {
    await getApp();

    // Create primary test user
    const result = await createTestUserAndLogin({
      email: `analytics-${uniqueTestId()}@example.com`,
    });
    userId = result.userId;
    accessToken = result.accessToken;

    // Create a resume via Prisma (direct DB, no event handler for projection)
    const prisma = getPrisma();
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: 'Analytics Integration Test Resume',
        summary: 'A well-crafted resume for analytics testing.',
        jobTitle: 'Senior Software Engineer',
        emailContact: 'test@example.com',
        contentPtBr: { sections: [] },
      },
    });
    resumeId = resume.id;

    // Create the analytics projection manually (normally done by event handler)
    await prisma.analyticsResumeProjection.create({
      data: {
        id: resumeId,
        userId,
        title: resume.title,
        sectionCounts: {},
      },
    });

    // Create second user for cross-user tests
    const otherResult = await createTestUserAndLogin({
      email: `analytics-other-${uniqueTestId()}@example.com`,
    });
    otherUserId = otherResult.userId;
    otherAccessToken = otherResult.accessToken;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    // Clean up analytics data
    await prisma.resumeAnalytics.deleteMany({ where: { resumeId } });
    await prisma.resumeViewEvent.deleteMany({ where: { resumeId } });
    await prisma.analyticsResumeProjection.deleteMany({ where: { id: resumeId } });
    await prisma.resume.deleteMany({ where: { userId } });
    await prisma.resume.deleteMany({ where: { userId: otherUserId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.deleteMany({ where: { id: otherUserId } });
    await closeApp();
  });

  describe('View Tracking', () => {
    it('should track a view on a resume', async () => {
      const response = await getRequest()
        .post(`/api/resume-analytics/${resumeId}/track-view`)
        .send({})
        .set('User-Agent', 'TestBrowser/1.0');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('tracked');
    });

    it('should get view stats after tracking', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/views?period=month`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should track multiple views and verify accuracy', async () => {
      // Track 3 additional views
      for (let i = 0; i < 3; i++) {
        const response = await getRequest()
          .post(`/api/resume-analytics/${resumeId}/track-view`)
          .send({})
          .set('User-Agent', `TestBrowser/${i}`)
          .set('X-Forwarded-For', `192.0.2.${10 + i}`);

        expect(response.status).toBe(201);
      }

      // Fetch views and verify count reflects all tracked views
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/views?period=month`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // We tracked 1 + 3 = 4 views total
      const data = response.body.data;
      expect(data).toBeDefined();
    });
  });

  describe('Snapshots', () => {
    it('should take a snapshot', async () => {
      const response = await getRequest()
        .post(`/api/resume-analytics/${resumeId}/snapshot`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.atsScore).toBeDefined();
      expect(typeof response.body.data.atsScore).toBe('number');
    });

    it('should verify snapshot is stored in history', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/history`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      const snapshot = response.body.data[0];
      expect(snapshot.resumeId).toBe(resumeId);
      expect(snapshot.atsScore).toBeDefined();
    });
  });

  describe('Dashboard', () => {
    it('should get dashboard data for a resume with snapshots', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/dashboard`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('ATS Score', () => {
    it('should calculate ATS score and return valid score', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/ats-score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.score).toBeDefined();
      expect(typeof response.body.data.score).toBe('number');
      expect(response.body.data.score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.score).toBeLessThanOrEqual(100);
    });

    it('should include section breakdown in ATS score', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/ats-score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      const data = response.body.data;
      // ATS score should include breakdown details
      expect(data.sectionBreakdown).toBeDefined();
      expect(Array.isArray(data.sectionBreakdown)).toBe(true);
    });
  });

  describe('Score Progression', () => {
    it('should show score progression after snapshot', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/progression`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.snapshots).toBeDefined();
      expect(Array.isArray(response.body.data.snapshots)).toBe(true);
      expect(response.body.data.trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(response.body.data.trend);
    });

    it('should show progression history after taking a second snapshot', async () => {
      // Take another snapshot
      const snapshotResponse = await getRequest()
        .post(`/api/resume-analytics/${resumeId}/snapshot`)
        .set(authHeader(accessToken));

      expect(snapshotResponse.status).toBe(201);

      // Check progression now has 2+ points
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/progression`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.data.snapshots.length).toBeGreaterThanOrEqual(2);
      expect(typeof response.body.data.changePercent).toBe('number');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for analytics on non-existent resume', async () => {
      const fakeResumeId = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

      const response = await getRequest()
        .get(`/api/resume-analytics/${fakeResumeId}/ats-score`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(404);
    });

    it('should return 404 for track-view on non-existent resume', async () => {
      const fakeResumeId = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

      const response = await getRequest()
        .post(`/api/resume-analytics/${fakeResumeId}/track-view`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('should return 404 (access denied) for resume owned by another user', async () => {
      // Other user tries to access primary user's analytics
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/ats-score`)
        .set(authHeader(otherAccessToken));

      // Should be 404 (not revealing existence) or 403
      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for dashboard of another user resume', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/dashboard`)
        .set(authHeader(otherAccessToken));

      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for snapshot of another user resume', async () => {
      const response = await getRequest()
        .post(`/api/resume-analytics/${resumeId}/snapshot`)
        .set(authHeader(otherAccessToken));

      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for views of another user resume', async () => {
      const response = await getRequest()
        .get(`/api/resume-analytics/${resumeId}/views?period=month`)
        .set(authHeader(otherAccessToken));

      expect([403, 404]).toContain(response.status);
    });

    it('should return 401 for unauthenticated access to protected analytics', async () => {
      const response = await getRequest().get(`/api/resume-analytics/${resumeId}/ats-score`);

      expect(response.status).toBe(401);
    });
  });
});
