/**
 * Route descriptors for the social BC's activity feed endpoints.
 * Replaces `ActivityController` and the legacy
 * `ActivityFeedSseController` — the SSE stream is now declared as a
 * `kind: 'sse'` Route descriptor and wired through a dedicated
 * `ActivitySseBundle`.
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
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

import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';
import { UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const UserIdParam = UserIdParamSchema;
export const UserIdAndTypeParam = UserIdParamSchema.extend({ type: z.string() }).openapi({
  example: { userId: '01900000-0000-7000-a000-000000000020', type: 'RESUME_CREATED' },
});
export const PageQuery = PaginationQuerySchema;

// ─── Response schemas ─────────────────────────────────────────────────
//
// `metadata` is a Prisma JSON column whose shape varies per `ActivityType`
// (e.g. `{followedUserId, followedUserName}` for `FOLLOWED_USER`). We
// model it as a permissive `record(unknown)` so contract drift checks
// don't flag per-type fields as extras.
export const ActivityMetadataSchema = z.record(z.string(), z.unknown()).nullable();

export const ActivityUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const ActivityWithUserSchema = z.object({
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
  createdAt: IsoDateTimeSchema,
  user: ActivityUserSchema.optional(),
});

export const ActivityPaginatedSchema = PaginatedResponseSchema(ActivityWithUserSchema);

export const ActivityFeedResponseSchema = ActivityPaginatedSchema;

export const UserActivitiesResponseSchema = ActivityPaginatedSchema;
