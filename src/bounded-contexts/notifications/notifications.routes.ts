/**
 * Route descriptors for the notifications BC. Replaces
 * `NotificationController` and the legacy `NotificationsSseController`
 * — the SSE stream is now declared as a `kind: 'sse'` Route descriptor
 * and wired through a dedicated `NotificationsSseBundle`.
 */

import type { NotificationType } from '@prisma/client';
import type { Observable } from 'rxjs';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { NotificationsUseCases } from './application/ports/notifications.port';
import type { NotificationStreamEvent } from './domain/entities/notification';

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

const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

const TypeParam = z.object({ type: z.string() });

const MarkReadBody = z.object({
  notificationId: z.string().optional(),
});

const SetPreferenceBody = z.object({
  enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailDelivery: z.enum(['INSTANT', 'DAILY', 'WEEKLY', 'OFF']).optional(),
});

export const notificationsRoutes: ReadonlyArray<Route<NotificationsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/notifications',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    query: PaginationQuery,
    openapi: {
      summary: 'Get notifications for current user',
      tags: ['notifications'],
      description: 'Notifications API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listNotifications.execute(
        ctx.user!.userId,
        q.cursor,
        q.limit ? Number(q.limit) : undefined,
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/notifications/unread-count',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    openapi: {
      summary: 'Get unread notification count',
      tags: ['notifications'],
      description: 'Notifications API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const count = await bc.getUnreadCount.execute(ctx.user!.userId);
      return { count };
    },
  },
  {
    method: 'POST',
    path: '/v1/notifications/mark-read',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    body: MarkReadBody,
    openapi: {
      summary: 'Mark notifications as read',
      tags: ['notifications'],
      description: 'Notifications API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof MarkReadBody>;
      return bc.markNotificationsRead.execute(ctx.user!.userId, body.notificationId);
    },
  },
  {
    method: 'GET',
    path: '/v1/notifications/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    openapi: {
      summary: 'Get notification preferences for the current user',
      tags: ['notifications'],
      description: 'Notifications API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const preferences = await bc.getPreferences.execute(ctx.user!.userId);
      return { preferences };
    },
  },
  {
    method: 'PUT',
    path: '/v1/notifications/preferences/:type',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    params: TypeParam,
    body: SetPreferenceBody,
    openapi: {
      summary:
        'Update a notification type preference (in-app enable + email channel + delivery mode).',
      tags: ['notifications'],
      description: 'Notifications API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { type } = ctx.params as { type: string };
      const body = ctx.body as z.infer<typeof SetPreferenceBody>;
      return bc.setPreference.execute(ctx.user!.userId, type as NotificationType, body);
    },
  },
];

/**
 * SSE routes for the notifications BC. Live in a separate group because
 * the `Route<TBundle>` shape pins the bundle type per group — the SSE
 * subscriber consumes `NotificationsSseBundle`, not `NotificationsUseCases`.
 */
export const notificationsSseRoutes: ReadonlyArray<Route<NotificationsSseBundle>> = [
  {
    method: 'GET',
    path: '/v1/notifications/subscribe',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    kind: 'sse',
    skip: ['responseWrapper'],
    openapi: {
      summary: 'Subscribe to notification stream',
      tags: ['notifications'],
      description: 'Pushes new notifications as they are created for the authenticated user.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => bundle.subscribeToUserStream(ctx.user!.userId),
  },
];
