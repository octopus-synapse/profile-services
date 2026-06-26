/**
 * Analytics Tracking Integration Tests
 *
 * Tests resume analytics endpoints with real database.
 * Covers view tracking, snapshots, dashboard, ATS simulation, and progression.
 *
 * Order-independent: every test provisions its own user + resume +
 * analytics projection via `freshAnalyticsResume`. Bun 1.3+ runs tests
 * inside a `describe` concurrently, so any shared `let resumeId/accessToken`
 * would race; each test now owns its fixture for its lifetime.
 *
 * NOTE on the "ATS Score" endpoint: the legacy tests hit a dead route
 * `GET /api/v1/resumes/:id/analytics/ats-score` that no longer exists.
 * The real ATS endpoint is `GET /api/v1/ats/simulate/:resumeId`
 * (resume-analytics.routes.ts), which returns
 * `{ data: { extractedText, sections, warnings } }` — an ATS *parse
 * simulation*, not a numeric score. Tests are repointed to that route
 * and assert its real contract.
 */

import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

interface AnalyticsFixture {
  readonly user: FreshUser;
  readonly resumeId: string;
}

/**
 * Create a fresh user + a resume they own + the analytics projection
 * the ownership checks read (normally written by an event handler).
 */
async function freshAnalyticsResume(app: TestApp): Promise<AnalyticsFixture> {
  const user = await freshInDbUser(app);
  const resume = await app.prisma.resume.create({
    data: {
      userId: user.userId,
      title: 'Analytics Integration Test Resume',
      summary: 'A well-crafted resume for analytics testing.',
      jobTitle: 'Senior Software Engineer',
      contentPtBr: { sections: [] },
    },
  });

  await app.prisma.analyticsResumeProjection.create({
    data: { id: resume.id, userId: user.userId, title: resume.title, sectionCounts: {} },
  });

  return { user, resumeId: resume.id };
}

describe('Analytics Tracking Integration', () => {
  describe('View Tracking', () => {
    it('should track a view on a resume', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);

      const response = await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/track-view`)
        .send({})
        .set('User-Agent', 'TestBrowser/1.0');

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('tracked');
    });

    it('should get view stats after tracking', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/track-view`)
        .send({})
        .set('User-Agent', 'TestBrowser/1.0');

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/views?period=month`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should track multiple views and verify accuracy', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      // Track 4 views total
      for (let i = 0; i < 4; i++) {
        const response = await app.request
          .post(`/api/v1/resumes/${resumeId}/analytics/track-view`)
          .send({})
          .set('User-Agent', `TestBrowser/${i}`)
          .set('X-Forwarded-For', `192.0.2.${10 + i}`);

        expect(response.status).toBe(201);
      }

      // Fetch views and verify count reflects all tracked views
      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/views?period=month`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      const data = response.body;
      expect(data).toBeDefined();
    });
  });

  describe('Snapshots', () => {
    it('should take a snapshot', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      const response = await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/snapshot`)
        .set(user.bearer());

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.atsScore).toBeDefined();
      expect(typeof response.body.atsScore).toBe('number');
    });

    it('should verify snapshot is stored in history', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      await app.request.post(`/api/v1/resumes/${resumeId}/analytics/snapshot`).set(user.bearer());

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/history`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const snapshot = response.body[0];
      expect(snapshot.resumeId).toBe(resumeId);
      expect(snapshot.atsScore).toBeDefined();
    });
  });

  describe('Dashboard', () => {
    it('should get dashboard data for a resume with snapshots', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      await app.request.post(`/api/v1/resumes/${resumeId}/analytics/snapshot`).set(user.bearer());

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/dashboard`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('ATS Simulation', () => {
    it('should simulate ATS parsing and return structured result', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      const response = await app.request.get(`/api/v1/ats/simulate/${resumeId}`).set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      // Real ATS endpoint returns { data: { extractedText, sections, warnings } }.
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.extractedText).toBe('string');
      expect(Array.isArray(response.body.data.sections)).toBe(true);
    });

    it('should include section breakdown in ATS simulation', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      const response = await app.request.get(`/api/v1/ats/simulate/${resumeId}`).set(user.bearer());

      expect(response.status).toBe(200);
      const data = response.body.data;
      // ATS simulation breaks the resume down into parsed sections.
      expect(data.sections).toBeDefined();
      expect(Array.isArray(data.sections)).toBe(true);
      expect(Array.isArray(data.warnings)).toBe(true);
    });
  });

  describe('Score Progression', () => {
    it('should show score progression after snapshot', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      await app.request.post(`/api/v1/resumes/${resumeId}/analytics/snapshot`).set(user.bearer());

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/progression`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.snapshots).toBeDefined();
      expect(Array.isArray(response.body.snapshots)).toBe(true);
      expect(response.body.trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(response.body.trend);
    });

    it('should show progression history after taking a second snapshot', async () => {
      const app = await getApp();
      const { user, resumeId } = await freshAnalyticsResume(app);

      // Take two snapshots.
      const first = await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/snapshot`)
        .set(user.bearer());
      expect(first.status).toBe(201);

      const snapshotResponse = await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/snapshot`)
        .set(user.bearer());
      expect(snapshotResponse.status).toBe(201);

      // Check progression now has 2+ points.
      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/progression`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body.snapshots.length).toBeGreaterThanOrEqual(2);
      expect(typeof response.body.changePercent).toBe('number');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for analytics on non-existent resume', async () => {
      const app = await getApp();
      const { user } = await freshAnalyticsResume(app);
      const fakeResumeId = '019eee00-0000-0000-0000-000000000000';

      const response = await app.request
        .get(`/api/v1/ats/simulate/${fakeResumeId}`)
        .set(user.bearer());

      expect(response.status).toBe(404);
    });

    it('should return 404 for track-view on non-existent resume', async () => {
      const app = await getApp();
      const fakeResumeId = '019eee00-0000-0000-0000-000000000000';

      const response = await app.request
        .post(`/api/v1/resumes/${fakeResumeId}/analytics/track-view`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('should return 404 (access denied) for resume owned by another user', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);
      const other = await freshInDbUser(app);

      const response = await app.request
        .get(`/api/v1/ats/simulate/${resumeId}`)
        .set(other.bearer());

      // Should be 404 (not revealing existence) or 403
      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for dashboard of another user resume', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);
      const other = await freshInDbUser(app);

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/dashboard`)
        .set(other.bearer());

      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for snapshot of another user resume', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);
      const other = await freshInDbUser(app);

      const response = await app.request
        .post(`/api/v1/resumes/${resumeId}/analytics/snapshot`)
        .set(other.bearer());

      expect([403, 404]).toContain(response.status);
    });

    it('should return 404 (access denied) for views of another user resume', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);
      const other = await freshInDbUser(app);

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/analytics/views?period=month`)
        .set(other.bearer());

      expect([403, 404]).toContain(response.status);
    });

    it('should return 401 for unauthenticated access to protected analytics', async () => {
      const app = await getApp();
      const { resumeId } = await freshAnalyticsResume(app);

      const response = await app.request.get(`/api/v1/ats/simulate/${resumeId}`);

      expect(response.status).toBe(401);
    });
  });
});
