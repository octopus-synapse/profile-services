/**
 * Route descriptors for the social BC's follow surface. Replaces
 * `FollowController`. The bundle wraps the three facade ports the
 * legacy controller injected (`FollowReaderPort`, `ActivityLoggerPort`,
 * `ConnectionReaderPort`) so the synthesizer can resolve a single DI
 * token at runtime.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  FollowersResponseSchema,
  FollowIdResponseSchema,
  FollowingResponseSchema,
  FollowRoutesBundle,
  IsFollowingResponseSchema,
  MeSocialStatsResponseSchema,
  PageQuery,
  SocialStatsResponseSchema,
  UnfollowResponseSchema,
  UserIdParam,
} from './follow.routes.schemas';

export type { FollowRoutesBundle } from './follow.routes.schemas';

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
      const { page, limit } = PageQuery.parse(ctx.query);
      const pagination = { page, limit };
      return bundle.followService.getFollowers(userId, pagination, ctx.user!.userId);
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
      const { page, limit } = PageQuery.parse(ctx.query);
      const pagination = { page, limit };
      return bundle.followService.getFollowing(userId, pagination, ctx.user!.userId);
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
