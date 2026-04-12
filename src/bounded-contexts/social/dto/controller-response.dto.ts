/**
 * Social Controller Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas - Using any for flexible service layer response types
// These are response DTOs that don't need runtime validation
// ============================================================================

const PaginatedResultSchema = z.object({
  data: z.array(z.any()),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ActivityFeedDataSchema = z.object({
  feed: PaginatedResultSchema,
});

const ActivityListDataSchema = z.object({
  activities: PaginatedResultSchema,
});

const FollowListDataSchema = z.object({
  followers: PaginatedResultSchema,
});

const FollowingListDataSchema = z.object({
  following: PaginatedResultSchema,
});

const UnfollowDataSchema = z.object({
  unfollowed: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ActivityFeedDataDto extends createZodDto(ActivityFeedDataSchema) {}
export class ActivityListDataDto extends createZodDto(ActivityListDataSchema) {}
export class FollowListDataDto extends createZodDto(FollowListDataSchema) {}
export class FollowingListDataDto extends createZodDto(FollowingListDataSchema) {}
export class UnfollowDataDto extends createZodDto(UnfollowDataSchema) {}
