import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  authHeader,
  createTestUserAndLogin,
  getPrisma,
} from './setup';

describe('Share Analytics Integration', () => {
  let userId: string;
  let accessToken: string;
  let resumeId: string;
  let shareId: string;
  let shareSlug: string;

  beforeAll(async () => {
    await getApp();
    const result = await createTestUserAndLogin();
    userId = result.userId;
    accessToken = result.accessToken;

    const prisma = getPrisma();
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: 'Analytics Test Resume',
        contentPtBr: { sections: [] },
      },
    });
    resumeId = resume.id;

    const share = await prisma.resumeShare.create({
      data: {
        resumeId,
        slug: `analytics-${Date.now()}`,
      },
    });
    shareId = share.id;
    shareSlug = share.slug;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.shareAnalytics.deleteMany({
      where: { shareId },
    });
    await prisma.resumeShare.delete({
      where: { id: shareId },
    });
    await prisma.resume.delete({
      where: { id: resumeId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    await closeApp();
  });

  describe('Event Tracking', () => {
    it('should track VIEW event when accessing public resume', async () => {
      await getRequest()
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .set('X-Forwarded-For', '203.0.113.42');

      const prisma = getPrisma();
      const analytics = await prisma.shareAnalytics.findFirst({
        where: { shareId, event: 'VIEW' },
      });

      expect(analytics).toBeDefined();
      expect(analytics.userAgent).toContain('Test Browser');
      expect(analytics.ipHash).toBeDefined();
      expect(analytics.ipHash).not.toBe('203.0.113.42'); // Should be anonymized
    });

    it('should track DOWNLOAD event', async () => {
      const response = await getRequest()
        .get(`/api/v1/public/resumes/${shareSlug}/download`)
        .set('User-Agent', 'DownloadBot/1.0')
        .set('X-Forwarded-For', '198.51.100.23');

      expect(response.status).toBe(200);

      const prisma = getPrisma();
      const analytics = await prisma.shareAnalytics.findFirst({
        where: { shareId, event: 'DOWNLOAD' },
      });

      expect(analytics).toBeDefined();
      expect(analytics.userAgent).toContain('DownloadBot');
    });

    it('should anonymize IP addresses (GDPR compliance)', async () => {
      const testIp = '192.0.2.146';

      await getRequest()
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('X-Forwarded-For', testIp);

      const prisma = getPrisma();
      const analytics = await prisma.shareAnalytics.findFirst({
        where: { shareId },
        orderBy: { createdAt: 'desc' },
      });

      // IP should be hashed (SHA-256 = 64 chars hex)
      expect(analytics.ipHash).not.toBe(testIp);
      expect(analytics.ipHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track referrer information', async () => {
      await getRequest()
        .get(`/api/v1/public/resumes/${shareSlug}`)
        .set('Referer', 'https://linkedin.com/in/johndoe');

      const prisma = getPrisma();
      const analytics = await prisma.shareAnalytics.findFirst({
        where: { shareId },
        orderBy: { createdAt: 'desc' },
      });

      expect(analytics.referer).toBe('https://linkedin.com/in/johndoe');
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get analytics summary for a share', async () => {
      const response = await getRequest()
        .get(`/api/v1/analytics/${shareId}`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        shareId,
        totalViews: expect.any(Number),
        totalDownloads: expect.any(Number),
        uniqueVisitors: expect.any(Number),
      });
    });

    it('should get detailed analytics events', async () => {
      const response = await getRequest()
        .get(`/api/v1/analytics/${shareId}/events`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('eventType');
      expect(response.body[0]).toHaveProperty('createdAt');
      expect(response.body[0]).toHaveProperty('userAgent');
    });

    it('should filter analytics by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await getRequest()
        .get(`/api/v1/analytics/${shareId}/events`)
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        })
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter analytics by event type', async () => {
      const response = await getRequest()
        .get(`/api/v1/analytics/${shareId}/events`)
        .query({ eventType: 'VIEW' })
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      expect(response.body.every((e) => e.eventType === 'VIEW')).toBe(true);
    });

    it('should not allow unauthorized access to analytics', async () => {
      const response = await getRequest().get(`/api/v1/analytics/${shareId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Privacy & Security', () => {
    it('should not expose raw IP addresses in responses', async () => {
      const response = await getRequest()
        .get(`/api/v1/analytics/${shareId}/events`)
        .set(authHeader(accessToken));

      expect(response.status).toBe(200);
      response.body.forEach((event) => {
        // IP should be hashed, not raw
        expect(event.ipAddress).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it('should track events for expired shares', async () => {
      const prisma = getPrisma();
      const expiredShare = await prisma.resumeShare.create({
        data: {
          resumeId,
          slug: `expired-analytics-${Date.now()}`,
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const response = await getRequest().get(
        `/api/v1/public/resumes/${expiredShare.slug}`,
      );

      expect(response.status).toBe(404);

      // Should still track the attempted access
      const analytics = await prisma.shareAnalytics.findFirst({
        where: { shareId: expiredShare.id },
      });

      expect(analytics).toBeDefined();
    });
  });
});
