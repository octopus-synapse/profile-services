/**
 * Route descriptors for the share-analytics submodule. Replaces
 * `ShareAnalyticsController`. Bundle token is the existing
 * `ShareAnalyticsReaderPort`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ShareAnalyticsReaderPort } from './application/ports/share-analytics-reader.port';

const ShareIdParam = z.object({ shareId: z.string() });
const ResumeShareParams = z.object({ resumeId: z.string(), shareId: z.string() });

const EventsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventType: z.enum(['VIEW', 'DOWNLOAD']).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
const ShareEventTypeSchema = z.enum(['VIEW', 'DOWNLOAD']);

const ShareAnalyticsRecentEventSchema = z.object({
  event: ShareEventTypeSchema,
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const ShareAnalyticsSummarySchema = z.object({
  shareId: z.string(),
  totalViews: z.number().int().min(0),
  totalDownloads: z.number().int().min(0),
  uniqueVisitors: z.number().int().min(0),
  byCountry: z.array(
    z.object({
      country: z.string().nullable(),
      count: z.number().int().min(0),
    }),
  ),
  recentEvents: z.array(ShareAnalyticsRecentEventSchema),
});

const ShareAnalyticsResponseSchema = z.object({
  analytics: ShareAnalyticsSummarySchema,
});

const ShareAnalyticsEventItemSchema = z.object({
  eventType: ShareEventTypeSchema,
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  referrer: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const ShareAnalyticsEventsResponseSchema = z.object({
  events: z.array(ShareAnalyticsEventItemSchema),
});

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
