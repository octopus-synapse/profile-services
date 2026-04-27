/**
 * Route descriptors for the social BC's activity feed endpoints.
 * Replaces `ActivityController` (the SSE controller stays as a legacy
 * Nest controller).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { ActivityType } from './application/ports/activity.port';
import type { ActivityReaderPort } from './application/ports/facade.ports';

export abstract class ActivityRoutesBundle {
  abstract readonly activityService: ActivityReaderPort;
}

const UserIdParam = z.object({ userId: z.string() });
const UserIdAndTypeParam = z.object({ userId: z.string(), type: z.string() });
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
    limit: Math.min(num(q.limit, 20), 100),
  };
}

export const activityRoutes: ReadonlyArray<Route<ActivityRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/users/:userId/feed',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    query: PageQuery,
    openapi: {
      summary: 'Get authenticated user activity feed',
      tags: ['social-activity'],
    },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.activityService.getFeed(userId, pagination);
      return { success: true, data: { feed: result } };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/activities',
    auth: { kind: 'jwt' },
    params: UserIdParam,
    query: PageQuery,
    openapi: {
      summary: 'Get public activities for a user',
      tags: ['social-activity'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.activityService.getUserActivities(userId, pagination);
      return { success: true, data: { activities: result } };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/activities/by-type/:type',
    auth: { kind: 'jwt' },
    params: UserIdAndTypeParam,
    query: PageQuery,
    openapi: {
      summary: 'Get user activities filtered by type',
      tags: ['social-activity'],
    },
    handler: async (ctx, bundle) => {
      const { userId, type } = ctx.params as { userId: string; type: string };
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.activityService.getActivitiesByType(
        userId,
        type as ActivityType,
        pagination,
      );
      return { success: true, data: { activities: result } };
    },
  },
];
