/**
 * Route descriptors for the social BC's follow surface. Replaces
 * `FollowController`. The bundle wraps the three facade ports the
 * legacy controller injected (`FollowReaderPort`, `ActivityLoggerPort`,
 * `ConnectionReaderPort`) so the synthesizer can resolve a single DI
 * token at runtime.
 */

import { z } from 'zod';
import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';
import { IdParamSchema, UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import type {
  ActivityLoggerPort,
  ConnectionReaderPort,
  FollowReaderPort,
} from './application/ports/facade.ports';

export abstract class FollowRoutesBundle {
  abstract readonly followService: FollowReaderPort;
  abstract readonly activityService: ActivityLoggerPort;
  abstract readonly connectionService: ConnectionReaderPort;
}

export const UserIdParam = UserIdParamSchema;
export const PageQuery = PaginationQuerySchema;

// ─── Response schemas ─────────────────────────────────────────────────
export const FollowUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const FollowWithUserSchema = z.object({
  id: z.string(),
  followerId: z.string().uuid(),
  followingId: z.string().uuid(),
  createdAt: IsoDateTimeSchema,
  follower: FollowUserSchema.optional(),
  following: FollowUserSchema.optional(),
  isFollowedByMe: z.boolean().optional(),
});

export const FollowIdResponseSchema = IdParamSchema;

export const UnfollowResponseSchema = z.object({ unfollowed: z.literal(true) });

export const FollowersResponseSchema = PaginatedResponseSchema(FollowWithUserSchema);

export const FollowingResponseSchema = PaginatedResponseSchema(FollowWithUserSchema);

export const IsFollowingResponseSchema = z.object({ isFollowing: z.boolean() });

export const SocialStatsResponseSchema = z.object({
  followers: z.number().int().min(0),
  following: z.number().int().min(0),
  connections: z.number().int().min(0),
});

export const MeSocialStatsResponseSchema = SocialStatsResponseSchema.extend({
  pendingInvitations: z.number().int().min(0),
});
