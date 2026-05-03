/**
 * Route descriptors for the share-analytics submodule. Replaces
 * `ShareAnalyticsController`. Bundle token is the existing
 * `ShareAnalyticsReaderPort`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';
import {
  EventsQuerySchema,
  ResumeShareParams,
  ShareAnalyticsEventsResponseSchema,
  ShareAnalyticsResponseSchema,
  ShareIdParam,
} from './share-analytics.routes.schemas';

export const shareAnalyticsRoutes: ReadonlyArray<Route<ShareAnalyticsReaderPort>> = [
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/shares/:shareId/analytics',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeShareParams,
    response: ShareAnalyticsResponseSchema,
    openapi: {
      summary: 'Get analytics for a shared resume (nested route)',
      tags: ['share-analytics'],
      description: 'Share Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { shareId } = ctx.params as { resumeId: string; shareId: string };
      const analytics = await service.getAnalytics(shareId, ctx.user!.userId);
      return { analytics };
    },
  },
  {
    method: 'GET',
    path: '/v1/analytics/:shareId',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ShareIdParam,
    response: ShareAnalyticsResponseSchema,
    openapi: {
      summary: 'Get analytics for a share id',
      tags: ['share-analytics'],
      description: 'Share Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { shareId } = ctx.params as { shareId: string };
      const analytics = await service.getAnalytics(shareId, ctx.user!.userId);
      return { analytics };
    },
  },
  {
    method: 'GET',
    path: '/v1/analytics/:shareId/events',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ShareIdParam,
    query: EventsQuerySchema,
    response: ShareAnalyticsEventsResponseSchema,
    openapi: {
      summary: 'Get analytics events for a share id',
      tags: ['share-analytics'],
      description: 'Share Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { shareId } = ctx.params as { shareId: string };
      const q = ctx.query as z.infer<typeof EventsQuerySchema>;
      const events = await service.getEvents(shareId, ctx.user!.userId, {
        startDate: q.startDate ? new Date(q.startDate) : undefined,
        endDate: q.endDate ? new Date(q.endDate) : undefined,
        eventType: q.eventType,
      });
      return { events };
    },
  },
];
