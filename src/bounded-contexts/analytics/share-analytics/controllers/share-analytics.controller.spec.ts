import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { type RequestWithUser, ShareAnalyticsController } from './share-analytics.controller';

const createAnalyticsService = () => ({
  getAnalytics: mock(() => Promise.resolve({ shareId: 'share-1', totalViews: 10 })),
  getEvents: mock(() => Promise.resolve([{ eventType: 'VIEW' }])),
});

describe('ShareAnalyticsController - Contract', () => {
  let controller: ShareAnalyticsController;
  const buildReq = (): RequestWithUser =>
    ({
      user: { userId: 'user-1', email: 'john@example.com' },
    }) as unknown as RequestWithUser;

  beforeEach(() => {
    controller = new ShareAnalyticsController(createAnalyticsService() as never);
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
