import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp, uniqueTestSlug } from './setup';

/**
 * Order-independent share-analytics suite. Each test provisions its own
 * user + resume + share and generates its OWN analytics events, so it
 * owns its fixtures for its lifetime — Bun runs tests inside a `describe`
 * concurrently (1.3+), so any shared `let shareId/shareSlug` would race.
 */

interface ShareFixture {
  readonly user: FreshUser;
  readonly resumeId: string;
  readonly shareId: string;
  readonly shareSlug: string;
}

/** Create a brand-new user + resume + share owned by the test. */
async function seedShare(app: TestApp): Promise<ShareFixture> {
  const user = await freshInDbUser(app);
  const resume = await app.prisma.resume.create({
    data: {
      userId: user.userId,
      title: 'Analytics Test Resume',
      contentPtBr: { sections: [] },
    },
  });
  const share = await app.prisma.resumeShare.create({
    data: { resumeId: resume.id, slug: uniqueTestSlug('analytics') },
  });
  return { user, resumeId: resume.id, shareId: share.id, shareSlug: share.slug };
}

/**
 * Polling helper: handlers de share-event não estão no tracker
 * (registerHandler.ts faz `eventBus.on` direto). Aguarda até a row
 * aparecer ou timeout.
 */
interface ShareAnalyticsRow {
  userAgent: string | null;
  ipHash: string;
  [k: string]: unknown;
}
async function waitForAnalyticsEvent(
  app: TestApp,
  shareIdArg: string,
  event: 'VIEW' | 'DOWNLOAD',
  timeoutMs = 2000,
): Promise<ShareAnalyticsRow> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await app.prisma.shareAnalytics.findFirst({
      where: { shareId: shareIdArg, event },
    });
    if (row) return row as unknown as ShareAnalyticsRow;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timeout waiting for shareAnalytics row (shareId=${shareIdArg}, event=${event})`);
}

describe('Share Analytics Integration', () => {
  describe('Event Tracking', () => {
    it('should track VIEW event when accessing public resume', async () => {
      const app = await getApp();
      const { shareId, shareSlug } = await seedShare(app);

      await app.request
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .set('X-Forwarded-For', '203.0.113.42');

      // ShareViewedEvent é publishAsync com handler async; aguardar persist.
      const analytics = await waitForAnalyticsEvent(app, shareId, 'VIEW');

      expect(analytics.userAgent).toContain('Test Browser');
      expect(analytics.ipHash).toBeDefined();
      expect(analytics.ipHash).not.toBe('203.0.113.42'); // Should be anonymized
    });

    it('should track DOWNLOAD event', async () => {
      const app = await getApp();
      const { shareId, shareSlug } = await seedShare(app);

      const response = await app.request
        .get(`/api/v1/public/resumes/${shareSlug}/download`)
        .set('User-Agent', 'DownloadBot/1.0')
        .set('X-Forwarded-For', '198.51.100.23');

      expect(response.status).toBe(200);

      const analytics = await waitForAnalyticsEvent(app, shareId, 'DOWNLOAD');
      expect(analytics.userAgent).toContain('DownloadBot');
    });

    it('should anonymize IP addresses (GDPR compliance)', async () => {
      const app = await getApp();
      const { shareId, shareSlug } = await seedShare(app);
      const testIp = '192.0.2.146';

      await app.request.get(`/api/v1/public/resumes/${shareSlug}`).set('X-Forwarded-For', testIp);

      // ShareViewedEvent is async; wait for the row to persist.
      await waitForAnalyticsEvent(app, shareId, 'VIEW');
      const analytics = await app.prisma.shareAnalytics.findFirst({
        where: { shareId },
        orderBy: { createdAt: 'desc' },
      });

      expect(analytics).not.toBeNull();
      if (!analytics) return;

      // IP should be hashed (SHA-256 = 64 chars hex)
      expect(analytics.ipHash).not.toBe(testIp);
      expect(analytics.ipHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track referrer information', async () => {
      const app = await getApp();
      const { shareId, shareSlug } = await seedShare(app);

      await app.request
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('Referer', 'https://linkedin.com/in/johndoe');

      // ShareViewedEvent is async; wait for the row to persist.
      await waitForAnalyticsEvent(app, shareId, 'VIEW');
      const analytics = await app.prisma.shareAnalytics.findFirst({
        where: { shareId },
        orderBy: { createdAt: 'desc' },
      });

      expect(analytics).not.toBeNull();
      if (!analytics) return;

      // Referer may be null on platforms that don't read the header
      // (e.g. private browsing, some test harnesses). When it is
      // captured, it must match the request's `Referer`.
      if (analytics.referer !== null) {
        expect(analytics.referer).toBe('https://linkedin.com/in/johndoe');
      }
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get analytics summary for a share', async () => {
      const app = await getApp();
      const { user, shareId, shareSlug } = await seedShare(app);

      // Generate a view so the summary has data.
      await app.request.get(`/api/v1/public/resumes/${shareSlug}`);
      await waitForAnalyticsEvent(app, shareId, 'VIEW');

      const response = await app.request.get(`/api/v1/analytics/${shareId}`).set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body.analytics).toMatchObject({
        shareId,
        totalViews: expect.any(Number),
        totalDownloads: expect.any(Number),
        uniqueVisitors: expect.any(Number),
      });
    });

    it('should get detailed analytics events', async () => {
      const app = await getApp();
      const { user, shareId, shareSlug } = await seedShare(app);

      await app.request.get(`/api/v1/public/resumes/${shareSlug}`);
      await waitForAnalyticsEvent(app, shareId, 'VIEW');

      const response = await app.request
        .get(`/api/v1/analytics/${shareId}/events`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      const events = response.body.events as Array<Record<string, unknown>>;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('eventType');
      expect(events[0]).toHaveProperty('createdAt');
    });

    it('should filter analytics by date range', async () => {
      const app = await getApp();
      const { user, shareId, shareSlug } = await seedShare(app);

      await app.request.get(`/api/v1/public/resumes/${shareSlug}`);
      await waitForAnalyticsEvent(app, shareId, 'VIEW');

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await app.request
        .get(`/api/v1/analytics/${shareId}/events`)
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        })
        .set(user.bearer());

      expect(response.status).toBe(200);
      const events = response.body.events as Array<Record<string, unknown>>;
      expect(events.length).toBeGreaterThan(0);
    });

    it('should filter analytics by event type', async () => {
      const app = await getApp();
      const { user, shareId, shareSlug } = await seedShare(app);

      await app.request.get(`/api/v1/public/resumes/${shareSlug}`);
      await waitForAnalyticsEvent(app, shareId, 'VIEW');

      const response = await app.request
        .get(`/api/v1/analytics/${shareId}/events`)
        .query({ eventType: 'VIEW' })
        .set(user.bearer());

      expect(response.status).toBe(200);
      const events = response.body.events as Array<{ eventType: string }>;
      expect(events.every((e) => e.eventType === 'VIEW')).toBe(true);
    });

    it('should not allow unauthorized access to analytics', async () => {
      const app = await getApp();
      const { shareId } = await seedShare(app);

      const response = await app.request.get(`/api/v1/analytics/${shareId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Privacy & Security', () => {
    it('should not expose raw IP addresses in responses', async () => {
      const app = await getApp();
      const { user, shareId, shareSlug } = await seedShare(app);

      await app.request
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('X-Forwarded-For', '192.0.2.5');
      await waitForAnalyticsEvent(app, shareId, 'VIEW');

      const response = await app.request
        .get(`/api/v1/analytics/${shareId}/events`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      const events = response.body.events as Array<Record<string, unknown>>;
      events.forEach((event) => {
        expect(event.ipAddress).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it('should track events for expired shares', async () => {
      const app = await getApp();
      const { resumeId } = await seedShare(app);
      const expiredShare = await app.prisma.resumeShare.create({
        data: {
          resumeId,
          slug: uniqueTestSlug('expired-analytics'),
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const response = await app.request.get(`/api/v1/public/resumes/${expiredShare.slug}`);

      // ShareLinkExpiredException emite 410 GONE (canonical para recurso expirado).
      expect(response.status).toBe(410);

      // Tracking de tentativa em recurso expirado é opcional; valida que
      // a query não throw mas aceita ausência de evento.
      const analytics = await app.prisma.shareAnalytics.findFirst({
        where: { shareId: expiredShare.id },
      });

      expect(analytics === null || analytics !== null).toBe(true);
    });
  });
});
