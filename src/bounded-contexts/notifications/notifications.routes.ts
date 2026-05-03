/**
 * Route descriptors for the notifications BC. Replaces
 * `NotificationController` and the legacy `NotificationsSseController`
 * — the SSE stream is now declared as a `kind: 'sse'` Route descriptor
 * and wired through a dedicated `NotificationsSseBundle`.
 */

import type { NotificationType } from '@prisma/client';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { NotificationsUseCases } from './application/ports/notifications.port';
import {
  GetPreferencesResponseSchema,
  MarkReadBody,
  MarkReadResponseSchema,
  NotificationListResponseSchema,
  NotificationsSseBundle,
  NotificationTypesResponseSchema,
  PaginationQuery,
  SetPreferenceBody,
  SetPreferenceResponseSchema,
  TypeParam,
  UnreadCountResponseSchema,
} from './notifications.routes.schemas';

export type { NotificationsSseBundle } from './notifications.routes.schemas';

export const notificationsRoutes: ReadonlyArray<Route<NotificationsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/notifications',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    query: PaginationQuery,
    response: NotificationListResponseSchema,
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
    response: UnreadCountResponseSchema,
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
    response: MarkReadResponseSchema,
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
    path: '/v1/notifications/types',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    response: NotificationTypesResponseSchema,
    openapi: {
      summary: 'Notification types with channels + user preferences',
      tags: ['notifications'],
      description:
        'Returns `{types:[{key,label,description,category,channels:[{key,enabled,locked?}],userEnabled}]}`. The frontend renders the settings matrix directly from this payload — adding a new type is a backend-only change.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const userPrefs = await bc.getPreferences.execute(ctx.user!.userId);
      const prefByType = new Map<string, (typeof userPrefs)[number]>();
      for (const p of userPrefs) prefByType.set(p.type, p);

      const TYPES_META: ReadonlyArray<{
        key: NotificationType;
        label: string;
        description: string;
        category: 'social' | 'jobs' | 'scoring' | 'system';
      }> = [
        {
          key: 'POST_LIKED',
          label: 'Curtidas',
          description: 'Quando alguém curte seu post',
          category: 'social',
        },
        {
          key: 'POST_COMMENTED',
          label: 'Comentários',
          description: 'Quando alguém comenta seu post',
          category: 'social',
        },
        {
          key: 'POST_REPOSTED',
          label: 'Repostagens',
          description: 'Quando alguém reposta seu conteúdo',
          category: 'social',
        },
        {
          key: 'POST_BOOKMARKED',
          label: 'Salvamentos',
          description: 'Quando alguém salva seu post',
          category: 'social',
        },
        {
          key: 'COMMENT_REPLIED',
          label: 'Respostas a comentários',
          description: 'Quando alguém responde a um comentário seu',
          category: 'social',
        },
        {
          key: 'CONNECTION_REQUEST',
          label: 'Solicitações de conexão',
          description: 'Quando alguém pede para se conectar',
          category: 'social',
        },
        {
          key: 'CONNECTION_ACCEPTED',
          label: 'Conexões aceitas',
          description: 'Quando aceitam sua solicitação',
          category: 'social',
        },
        {
          key: 'FOLLOW_NEW',
          label: 'Novos seguidores',
          description: 'Quando alguém começa a te seguir',
          category: 'social',
        },
        {
          key: 'CONNECTION_RECOMMENDATION',
          label: 'Recomendações de conexão',
          description: 'Sugestões com base nas suas habilidades',
          category: 'social',
        },
        {
          key: 'SKILL_DECAY',
          label: 'Habilidade ociosa',
          description: 'Habilidade do seu currículo sem atividade há 120+ dias',
          category: 'scoring',
        },
        {
          key: 'APPLICATION_STALE',
          label: 'Aplicação parada',
          description: 'Aplicações sem atualização por 7/14/21 dias',
          category: 'jobs',
        },
        {
          key: 'FIT_PROFILE_EXPIRED',
          label: 'Perfil de fit expirado',
          description: 'Seu questionário de fit precisa ser refeito',
          category: 'scoring',
        },
        {
          key: 'FIT_PROFILE_EXPIRY_REMINDER',
          label: 'Lembrete de fit',
          description: 'Aviso 7/3/1 dias antes do fit expirar',
          category: 'scoring',
        },
        {
          key: 'MATCH_RECOMMENDATIONS_READY',
          label: 'Novos matches',
          description: 'Recomendações diárias prontas',
          category: 'jobs',
        },
        {
          key: 'RESUME_QUALITY_IMPROVED',
          label: 'Qualidade subiu',
          description: 'Seu currículo melhorou de faixa',
          category: 'scoring',
        },
        {
          key: 'RESUME_QUALITY_REGRESSED',
          label: 'Qualidade caiu',
          description: 'Seu currículo caiu de faixa',
          category: 'scoring',
        },
      ];

      const types = TYPES_META.map((meta) => {
        const pref = prefByType.get(meta.key);
        const inappEnabled = pref?.enabled ?? true;
        const emailEnabled = pref?.emailEnabled ?? false;
        return {
          key: meta.key,
          label: meta.label,
          description: meta.description,
          category: meta.category,
          channels: [
            { key: 'inapp' as const, enabled: inappEnabled },
            { key: 'email' as const, enabled: emailEnabled },
          ],
          userEnabled: inappEnabled,
        };
      });
      return { types };
    },
  },
  {
    method: 'GET',
    path: '/v1/notifications/preferences',
    auth: { kind: 'jwt' },
    permission: Permission.NOTIFICATION_READ,
    response: GetPreferencesResponseSchema,
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
    response: SetPreferenceResponseSchema,
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
