/**
 * Route descriptors for the social BC's follow surface. Replaces
 * `FollowController`. The bundle wraps the three facade ports the
 * legacy controller injected (`FollowReaderPort`, `ActivityLoggerPort`,
 * `ConnectionReaderPort`) so the synthesizer can resolve a single DI
 * token at runtime.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
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

const UserIdParam = z.object({ userId: z.string() });
const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function paginate(q: { page?: string; limit?: string }): { page: number; limit: number } {
  return {
    page: num(q.page, 1),
    limit: Math.min(num(q.limit, 10), 100),
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
const FollowUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const FollowWithUserSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.string().datetime(),
  follower: FollowUserSchema.optional(),
  following: FollowUserSchema.optional(),
  isFollowedByMe: z.boolean().optional(),
});

const FollowPaginatedSchema = z.object({
  data: z.array(FollowWithUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

const FollowIdResponseSchema = z.object({ id: z.string() });

const UnfollowResponseSchema = z.object({ unfollowed: z.literal(true) });

const FollowersResponseSchema = z.object({ followers: FollowPaginatedSchema });

const FollowingResponseSchema = z.object({ following: FollowPaginatedSchema });

const IsFollowingResponseSchema = z.object({ isFollowing: z.boolean() });

const SocialStatsResponseSchema = z.object({
  followers: z.number().int().min(0),
  following: z.number().int().min(0),
  connections: z.number().int().min(0),
});

const MeSocialStatsResponseSchema = SocialStatsResponseSchema.extend({
  pendingInvitations: z.number().int().min(0),
});

export const followRoutes: ReadonlyArray<Route<FollowRoutesBundle>> = [
  {
    method: 'POST',
    path: '/v1/users/:userId/follow',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: FollowIdResponseSchema,
    openapi: {
      summary: 'Follow a user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      const viewerId = ctx.user!.userId;
      const follow = await bundle.followService.follow(viewerId, targetUserId);

      if (follow.following) {
        bundle.activityService
          .logFollowedUser(
            viewerId,
            targetUserId,
            follow.following.name ?? follow.following.username ?? 'User',
          )
          .catch(() => {
            // Ignore activity logging errors.
          });
      }

      return { id: follow.id };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/users/:userId/follow',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: UnfollowResponseSchema,
    openapi: {
      summary: 'Unfollow a user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      await bundle.followService.unfollow(ctx.user!.userId, targetUserId);
      return { unfollowed: true };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/followers',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    query: PageQuery,
    response: FollowersResponseSchema,
    openapi: {
      summary: 'Get followers for a user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.followService.getFollowers(userId, pagination, ctx.user!.userId);
      return { followers: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/following',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    query: PageQuery,
    response: FollowingResponseSchema,
    openapi: {
      summary: 'Get users followed by a user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.followService.getFollowing(userId, pagination, ctx.user!.userId);
      return { following: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/is-following',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: IsFollowingResponseSchema,
    openapi: {
      summary: 'Check following relationship',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      const isFollowing = await bundle.followService.isFollowing(ctx.user!.userId, targetUserId);
      return { isFollowing };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/social-stats',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    response: MeSocialStatsResponseSchema,
    openapi: {
      summary: 'Get social stats for authenticated user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const [stats, pendingResult] = await Promise.all([
        bundle.followService.getSocialStats(userId),
        bundle.connectionService.getPendingRequests(userId, { page: 1, limit: 1 }),
      ]);
      return {
        ...stats,
        pendingInvitations: pendingResult.total,
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/social-stats',
    auth: { kind: 'public' },
    params: UserIdParam,
    response: SocialStatsResponseSchema,
    openapi: {
      summary: 'Get social stats for a user',
      tags: ['social-follow'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const stats = await bundle.followService.getSocialStats(userId);
      return stats;
    },
  },
];
