import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  type ShareAnalyticsEventItem,
  ShareAnalyticsReaderPort,
  type ShareAnalyticsSummary,
} from '../application/ports/share-analytics-reader.port';
import { type RequestWithUser, ShareAnalyticsController } from './share-analytics.controller';

class StubShareAnalyticsReader extends ShareAnalyticsReaderPort {
  getAnalytics = mock(
    async (shareId: string, _userId: string): Promise<ShareAnalyticsSummary> => ({
      shareId,
      totalViews: 10,
      totalDownloads: 0,
      uniqueVisitors: 5,
      byCountry: [],
      recentEvents: [],
    }),
  );
  getEvents = mock(
    async (): Promise<ShareAnalyticsEventItem[]> => [
      {
        eventType: 'VIEW',
        ipAddress: 'hash',
        userAgent: null,
        referrer: null,
        country: null,
        city: null,
        createdAt: new Date(),
      },
    ],
  );
}

describe('ShareAnalyticsController - Contract', () => {
  let controller: ShareAnalyticsController;
  const buildReq = (): RequestWithUser => ({
    user: { userId: 'user-1', email: 'john@example.com' },
  });

  beforeEach(() => {
    controller = new ShareAnalyticsController(new StubShareAnalyticsReader());
  });

  it('getAnalyticsNested returns data with analytics', async () => {
    const result = await controller.getAnalyticsNested('resume-1', 'share-1', buildReq());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('analytics');
  });

  it('getAnalytics returns data with analytics', async () => {
    const result = await controller.getAnalytics('share-1', buildReq());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('analytics');
  });

  it('getAnalyticsEvents returns data with events', async () => {
    const result = await controller.getAnalyticsEvents(
      'share-1',
      buildReq(),
      undefined,
      undefined,
      'VIEW',
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('events');
  });
});
