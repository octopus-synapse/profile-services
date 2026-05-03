/**
 * Route descriptors for the social BC's follow surface. Replaces
 * `FollowController`. The bundle wraps the three facade ports the
 * legacy controller injected (`FollowReaderPort`, `ActivityLoggerPort`,
 * `ConnectionReaderPort`) so the synthesizer can resolve a single DI
 * token at runtime.
 */

import { z } from 'zod';
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

export const UserIdParam = z.object({ userId: z.string() });
export const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function paginate(q: { page?: string; limit?: string }): { page: number; limit: number } {
  return {
    page: num(q.page, 1),
    limit: Math.min(num(q.limit, 10), 100),
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
export const FollowUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const FollowWithUserSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.string().datetime(),
  follower: FollowUserSchema.optional(),
  following: FollowUserSchema.optional(),
  isFollowedByMe: z.boolean().optional(),
});

export const FollowPaginatedSchema = z.object({
  data: z.array(FollowWithUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export const FollowIdResponseSchema = z.object({ id: z.string() });

export const UnfollowResponseSchema = z.object({ unfollowed: z.literal(true) });

export const FollowersResponseSchema = z.object({ followers: FollowPaginatedSchema });

export const FollowingResponseSchema = z.object({ following: FollowPaginatedSchema });

export const IsFollowingResponseSchema = z.object({ isFollowing: z.boolean() });

export const SocialStatsResponseSchema = z.object({
  followers: z.number().int().min(0),
  following: z.number().int().min(0),
  connections: z.number().int().min(0),
});

export const MeSocialStatsResponseSchema = SocialStatsResponseSchema.extend({
  pendingInvitations: z.number().int().min(0),
});
