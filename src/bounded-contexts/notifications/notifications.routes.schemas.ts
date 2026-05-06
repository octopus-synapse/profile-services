/**
 * Route descriptors for the notifications BC. Replaces
 * `NotificationController` and the legacy `NotificationsSseController`
 * — the SSE stream is now declared as a `kind: 'sse'` Route descriptor
 * and wired through a dedicated `NotificationsSseBundle`.
 */

import type { NotificationType } from '@prisma/client';
import type { Observable } from 'rxjs';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import type { NotificationStreamEvent } from './domain/entities/notification.entity';

/**
 * Bundle for the notifications SSE route. Holds an Observable-returning
 * subscribe method backed by the shared `SseStreamPort` (wired in
 * `buildNotificationsSseBundle` inside `notifications.composition.ts`).
 */
export interface NotificationsSseEvent {
  readonly data: NotificationStreamEvent;
  readonly id: string;
  readonly type: string;
  readonly retry: number;
}

export abstract class NotificationsSseBundle {
  abstract subscribeToUserStream(userId: string): Observable<NotificationsSseEvent>;
}

export const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export const TypeParam = z.object({ type: z.string() });

export const MarkReadBody = z.object({
  notificationId: z.string().optional(),
});

export const SetPreferenceBody = z.object({
  enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailDelivery: z.enum(['INSTANT', 'DAILY', 'WEEKLY', 'OFF']).optional(),
});

// ─── Response schemas ────────────────────────────────────────────────
// Mirrors `NotificationType` from the Prisma enum — keep in sync with
// `src/bounded-contexts/notifications/domain/entities/notification.ts`.
export const NOTIFICATION_TYPES = [
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_REPOSTED',
  'POST_BOOKMARKED',
  'COMMENT_REPLIED',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'FOLLOW_NEW',
  'CONNECTION_RECOMMENDATION',
  'SKILL_DECAY',
  'APPLICATION_STALE',
  'FIT_PROFILE_EXPIRED',
  'FIT_PROFILE_EXPIRY_REMINDER',
  'MATCH_RECOMMENDATIONS_READY',
  'RESUME_QUALITY_IMPROVED',
  'RESUME_QUALITY_REGRESSED',
] as const satisfies readonly NotificationType[];

export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const EmailDeliveryModeSchema = z.enum(['INSTANT', 'DAILY', 'WEEKLY', 'OFF']);

export const NotificationActorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

// `createdAt` is a `Date` in the domain; the JSON envelope stringifies
// it via the global serializer (Date → ISO string).
export const NotificationViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  actorId: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  message: z.string(),
  read: z.boolean(),
  createdAt: IsoDateTimeSchema,
  actor: NotificationActorSchema.nullable(),
});

export const NotificationListResponseSchema = z.object({
  data: z.array(NotificationViewSchema),
  nextCursor: z.string().nullable(),
});

export const UnreadCountResponseSchema = z.object({ count: z.number().int().min(0) });

export const MarkReadResponseSchema = z.object({ count: z.number().int().min(0) });

export const NotificationPreferenceSchema = z.object({
  type: NotificationTypeSchema,
  enabled: z.boolean(),
  emailEnabled: z.boolean(),
  emailDelivery: EmailDeliveryModeSchema,
});

export const GetPreferencesResponseSchema = z.object({
  preferences: z.array(NotificationPreferenceSchema),
});

export const NotificationTypeMetaSchema = z.object({
  key: NotificationTypeSchema,
  label: z.string(),
  description: z.string(),
  category: z.enum(['social', 'jobs', 'scoring', 'system']),
  channels: z.array(
    z.object({
      key: z.enum(['inapp', 'email']),
      enabled: z.boolean(),
    }),
  ),
  userEnabled: z.boolean(),
});

export const NotificationTypesResponseSchema = z.object({
  types: z.array(NotificationTypeMetaSchema),
});

export const SetPreferenceResponseSchema = NotificationPreferenceSchema;
