/**
 * Route descriptors for the share-analytics submodule. Replaces
 * `ShareAnalyticsController`. Bundle token is the existing
 * `ShareAnalyticsReaderPort`.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ShareIdParam = z.object({ shareId: z.string() });
export const ResumeShareParams = z.object({ resumeId: z.string(), shareId: z.string() });

export const EventsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventType: z.enum(['VIEW', 'DOWNLOAD']).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
export const ShareEventTypeSchema = z.enum(['VIEW', 'DOWNLOAD']);

export const ShareAnalyticsRecentEventSchema = z.object({
  event: ShareEventTypeSchema,
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ShareAnalyticsSummarySchema = z.object({
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
  byDeviceType: z.array(
    z.object({
      deviceType: z.string().nullable(),
      count: z.number().int().min(0),
    }),
  ),
  recentEvents: z.array(ShareAnalyticsRecentEventSchema),
});

export const ShareAnalyticsResponseSchema = z.object({
  analytics: ShareAnalyticsSummarySchema,
});

export const ShareAnalyticsEventItemSchema = z.object({
  eventType: ShareEventTypeSchema,
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  referrer: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ShareAnalyticsEventsResponseSchema = z.object({
  events: z.array(ShareAnalyticsEventItemSchema),
});
