/**
 * Route descriptors for the social BC's activity feed endpoints.
 * Replaces `ActivityController` and the legacy
 * `ActivityFeedSseController` — the SSE stream is now declared as a
 * `kind: 'sse'` Route descriptor and wired through a dedicated
 * `ActivitySseBundle`.
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { ActivityType, ActivityWithUser } from './application/ports/activity.port';
import type { ActivityReaderPort } from './application/ports/facade.ports';

export abstract class ActivityRoutesBundle {
  abstract readonly activityService: ActivityReaderPort;
}

export interface ActivityFeedSseEvent {
  readonly data: ActivityWithUser;
  readonly id: string;
  readonly type: string;
  readonly retry: number;
}

export abstract class ActivitySseBundle {
  abstract subscribeToFeed(userId: string): Observable<ActivityFeedSseEvent>;
  abstract subscribeToFeedByType(
    userId: string,
    type: ActivityType,
  ): Observable<ActivityFeedSseEvent>;
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

// ─── Response schemas ─────────────────────────────────────────────────
//
// `metadata` is a Prisma JSON column whose shape varies per `ActivityType`
// (e.g. `{followedUserId, followedUserName}` for `FOLLOWED_USER`). We
// model it as a permissive `passthrough()` object — the same pattern
// `feed/dto/create-post-request.dto.ts` uses for similarly-typed JSON
// payloads.
const ActivityMetadataSchema = z.object({}).passthrough().nullable();

const ActivityUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const ActivityWithUserSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'RESUME_CREATED',
    'RESUME_UPDATED',
    'RESUME_SHARED',
    'RESUME_PUBLISHED',
    'THEME_PUBLISHED',
    'ACHIEVEMENT_EARNED',
    'SKILL_ADDED',
    'PROFILE_UPDATED',
    'FOLLOWED_USER',
    'CONNECTED_USER',
  ]),
  metadata: ActivityMetadataSchema,
  entityId: z.string().nullable(),
  entityType: z.string().nullable(),
  createdAt: z.string().datetime(),
  user: ActivityUserSchema.optional(),
});

/**
 * Legacy paginated shape returned by `ActivityService` —
 * `{data, total, page, limit, totalPages}`. Distinct from the canonical
 * `{items, total, ..., hasNext, hasPrev}` envelope; mirrors the actual
 * JSON the handler emits (no migration scheduled yet).
 */
const ActivityPaginatedSchema = z.object({
  data: z.array(ActivityWithUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

const ActivityFeedResponseSchema = z.object({ feed: ActivityPaginatedSchema });

const UserActivitiesResponseSchema = z.object({ activities: ActivityPaginatedSchema });

export const activityRoutes: ReadonlyArray<Route<ActivityRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/users/:userId/feed',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    query: PageQuery,
    response: ActivityFeedResponseSchema,
    openapi: {
      summary: 'Get authenticated user activity feed',
      tags: ['social-activity'],
    },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.activityService.getFeed(userId, pagination);
      return { feed: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/activities',
    auth: { kind: 'jwt' },
    params: UserIdParam,
    query: PageQuery,
    response: UserActivitiesResponseSchema,
    openapi: {
      summary: 'Get public activities for a user',
      tags: ['social-activity'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.activityService.getUserActivities(userId, pagination);
      return { activities: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/activities/by-type/:type',
    auth: { kind: 'jwt' },
    params: UserIdAndTypeParam,
    query: PageQuery,
    response: UserActivitiesResponseSchema,
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
      return { activities: result };
    },
  },
];

const TypeOnlyParam = z.object({ type: z.string() });

/**
 * SSE routes for the activity feed. Live in a separate group because
 * the `Route<TBundle>` shape pins the bundle type per group — the SSE
 * subscriber consumes `ActivitySseBundle`, not `ActivityRoutesBundle`.
 */
export const activitySseRoutes: ReadonlyArray<Route<ActivitySseBundle>> = [
  {
    method: 'GET',
    path: '/v1/feed/subscribe',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    kind: 'sse',
    skip: ['responseWrapper'],
    openapi: {
      summary: 'Subscribe to activity feed stream',
      tags: ['social-feed'],
      description: 'Streams real-time feed updates for the authenticated user.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => bundle.subscribeToFeed(ctx.user!.userId),
  },
  {
    method: 'GET',
    path: '/v1/feed/subscribe/:type',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    kind: 'sse',
    skip: ['responseWrapper'],
    params: TypeOnlyParam,
    openapi: {
      summary: 'Subscribe to activity type stream',
      tags: ['social-feed'],
      description: 'Streams real-time feed updates filtered by activity type.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => {
      const { type } = ctx.params as { type: string };
      return bundle.subscribeToFeedByType(ctx.user!.userId, type as ActivityType);
    },
  },
];
