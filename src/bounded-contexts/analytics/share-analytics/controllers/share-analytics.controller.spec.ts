import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import {
  type ShareAnalyticsEventItem,
  ShareAnalyticsReaderPort,
  type ShareAnalyticsSummary,
} from '../application/ports/share-analytics-reader.port';
import { shareAnalyticsRoutes } from '../share-analytics.routes';

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

function findRoute(method: string, path: string): Route<ShareAnalyticsReaderPort> {
  const r = shareAnalyticsRoutes.find((rt) => rt.method === method && rt.path === path);
  if (!r) throw new Error(`Route not found: ${method} ${path}`);
  return r as Route<ShareAnalyticsReaderPort>;
}

function makeCtx(partial: {
  query?: Record<string, unknown>;
  params?: Record<string, string>;
}): HttpCtx {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    body: {},
    query: (partial.query ?? {}) as HttpCtx['query'],
    params: (partial.params ?? {}) as HttpCtx['params'],
    user: { userId: 'user-1', email: 'john@example.com' },
    state: {},
  };
}

describe('ShareAnalyticsRoutes - Contract', () => {
  let reader: StubShareAnalyticsReader;

  beforeEach(() => {
    reader = new StubShareAnalyticsReader();
  });

  it('GET /v1/resumes/:resumeId/shares/:shareId/analytics returns data with analytics', async () => {
    const r = findRoute('GET', '/v1/resumes/:resumeId/shares/:shareId/analytics');
    const result = (await r.handler(
      makeCtx({ params: { resumeId: 'resume-1', shareId: 'share-1' } }),
      reader,
    )) as { success: boolean; data: { analytics: unknown } };

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('analytics');
  });

  it('GET /v1/analytics/:shareId returns data with analytics', async () => {
    const r = findRoute('GET', '/v1/analytics/:shareId');
    const result = (await r.handler(makeCtx({ params: { shareId: 'share-1' } }), reader)) as {
      success: boolean;
      data: { analytics: unknown };
    };

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('analytics');
  });

  it('GET /v1/analytics/:shareId/events returns data with events', async () => {
    const r = findRoute('GET', '/v1/analytics/:shareId/events');
    const parsed = r.query!.parse({ eventType: 'VIEW' });
    const result = (await r.handler(
      makeCtx({ params: { shareId: 'share-1' }, query: parsed }),
      reader,
    )) as { success: boolean; data: { events: unknown } };

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('events');
  });
});
