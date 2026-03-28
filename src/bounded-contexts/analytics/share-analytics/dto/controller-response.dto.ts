/**
 * Share Analytics Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ShareAnalyticsSummaryDataSchema = z.object({
  analytics: z.record(z.unknown()),
});

const ShareAnalyticsEventsDataSchema = z.object({
  events: z.array(z.record(z.unknown())),
});

// ============================================================================
// DTOs
// ============================================================================

export class ShareAnalyticsSummaryDataDto extends createZodDto(ShareAnalyticsSummaryDataSchema) {}
export class ShareAnalyticsEventsDataDto extends createZodDto(ShareAnalyticsEventsDataSchema) {}
