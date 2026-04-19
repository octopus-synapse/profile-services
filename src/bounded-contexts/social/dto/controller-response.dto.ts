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

const FollowUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const FollowerRowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  follower: FollowUserSchema.optional(),
  isFollowedByMe: z.boolean().optional(),
});

const FollowingRowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  following: FollowUserSchema.optional(),
  isFollowedByMe: z.boolean().optional(),
});

const FollowersPaginatedSchema = PaginatedResultSchema.extend({
  data: z.array(FollowerRowSchema),
});

const FollowingPaginatedSchema = PaginatedResultSchema.extend({
  data: z.array(FollowingRowSchema),
});

const ActivityFeedDataSchema = z.object({
  feed: PaginatedResultSchema,
});

const ActivityListDataSchema = z.object({
  activities: PaginatedResultSchema,
});

const FollowListDataSchema = z.object({
  followers: FollowersPaginatedSchema,
});

const FollowingListDataSchema = z.object({
  following: FollowingPaginatedSchema,
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
