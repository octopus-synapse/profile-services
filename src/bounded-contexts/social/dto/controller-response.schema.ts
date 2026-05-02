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

const FollowersPaginatedSchema = PaginatedResultSchema.extend({ data: z.array(FollowerRowSchema) });

const FollowingPaginatedSchema = PaginatedResultSchema.extend({
  data: z.array(FollowingRowSchema),
});

const ActivityFeedDataSchema = z.object({ feed: PaginatedResultSchema });

const ActivityListDataSchema = z.object({ activities: PaginatedResultSchema });

const FollowListDataSchema = z.object({ followers: FollowersPaginatedSchema });

const FollowingListDataSchema = z.object({ following: FollowingPaginatedSchema });

const UnfollowDataSchema = z.object({ unfollowed: z.boolean() });

// ============================================================================
// DTOs
// ============================================================================

export type FollowUserDto = z.infer<typeof FollowUserSchema>;

export type FollowerRowDto = z.infer<typeof FollowerRowSchema>;

export type FollowingRowDto = z.infer<typeof FollowingRowSchema>;

export type FollowersPaginatedDto = z.infer<typeof FollowersPaginatedSchema>;

export type FollowingPaginatedDto = z.infer<typeof FollowingPaginatedSchema>;

export type ActivityFeedDataDto = z.infer<typeof ActivityFeedDataSchema>;

export type ActivityListDataDto = z.infer<typeof ActivityListDataSchema>;

export type FollowListDataDto = z.infer<typeof FollowListDataSchema>;

export type FollowingListDataDto = z.infer<typeof FollowingListDataSchema>;

export type UnfollowDataDto = z.infer<typeof UnfollowDataSchema>;
