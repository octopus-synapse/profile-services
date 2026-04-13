/**
 * Share Analytics Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const CountryBreakdownSchema = z.object({
  country: z.string().nullable(),
  count: z.number().int(),
});

const RecentEventSchema = z.object({
  event: z.enum(['VIEW', 'DOWNLOAD']),
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.date(),
});

const ShareAnalyticsSummarySchema = z.object({
  shareId: z.string(),
  totalViews: z.number().int(),
  totalDownloads: z.number().int(),
  uniqueVisitors: z.number().int(),
  byCountry: z.array(CountryBreakdownSchema),
  recentEvents: z.array(RecentEventSchema),
});

const ShareAnalyticsSummaryDataSchema = z.object({
  analytics: ShareAnalyticsSummarySchema,
});

const AnalyticsEventItemSchema = z.object({
  eventType: z.enum(['VIEW', 'DOWNLOAD']),
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  referrer: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.date(),
});

const ShareAnalyticsEventsDataSchema = z.object({
  events: z.array(AnalyticsEventItemSchema),
});

// ============================================================================
// DTOs
// ============================================================================

export class CountryBreakdownDto extends createZodDto(CountryBreakdownSchema) {}
export class RecentEventDto extends createZodDto(RecentEventSchema) {}
export class ShareAnalyticsSummaryDto extends createZodDto(ShareAnalyticsSummarySchema) {}
export class ShareAnalyticsSummaryDataDto extends createZodDto(ShareAnalyticsSummaryDataSchema) {}
export class AnalyticsEventItemDto extends createZodDto(AnalyticsEventItemSchema) {}
export class ShareAnalyticsEventsDataDto extends createZodDto(ShareAnalyticsEventsDataSchema) {}
