/**
 * Route descriptors for the ui-metadata BC. Replaces
 * `UiMetadataController` and `MeDashboardController`.
 */

import { z } from 'zod';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import {
  buildSettingsSection,
  EnumDescriptorResponseSchema,
  EnumKeyParams,
  EnumKeysResponseSchema,
  MeDashboardResponseSchema,
  SettingsSectionParams,
  SettingsSectionResponseSchema,
  UserMenuResponseSchema,
} from './ui-metadata.routes.schemas';

export const uiMetadataRoutes: ReadonlyArray<Route<UiMetadataUseCases>> = [
  {
    method: 'GET',
    path: '/v1/enums',
    auth: { kind: 'public' },
    response: EnumKeysResponseSchema,
    openapi: {
      summary: 'List all enum keys exposed by the catalog.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      return bc.listEnumKeys.execute();
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/:key',
    auth: { kind: 'public' },
    params: EnumKeyParams,
    response: EnumDescriptorResponseSchema,
    openapi: {
      summary:
        'Full descriptor for a UI enum (notification-types, job-application-event-types, etc.) with localized labels + icon hints.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      const out = bc.getEnumDescriptor.execute(key);
      if (!out) {
        throw new EntityNotFoundException('Enum', key);
      }
      return out;
    },
  },
  {
    method: 'GET',
    path: '/v1/me/menu',
    auth: { kind: 'jwt' },
    response: UserMenuResponseSchema,
    openapi: {
      summary:
        'Permission-aware navigation tree for the current user with labels in the request locale.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const menu = await bc.getUserMenu.execute(ctx.user!.userId);
      return { menu };
    },
  },
  {
    method: 'GET',
    path: '/v1/pages/me-dashboard',
    auth: { kind: 'jwt' },
    response: MeDashboardResponseSchema,
    openapi: {
      summary: 'Composite dashboard widgets (server-driven)',
      tags: ['pages'],
      description:
        'Returns `{widgets:[{id,type,title,size,data,actions?,cta?}]}`. Adding/removing widgets is a backend-only change. Today the server emits widgets for greeting, counters, recent notifications and follow-ups; the frontend simply iterates `widgets[]` and dispatches on `type`.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const data = await bc.loadMeDashboard.execute(ctx.user!.userId);
      return {
        widgets: [
          {
            id: 'greeting',
            type: 'greeting-hero' as const,
            title: data.viewer.name ?? data.viewer.email ?? 'Olá',
            size: 'wide' as const,
            data: { viewer: data.viewer },
          },
          {
            id: 'counters',
            type: 'counter-grid' as const,
            title: 'Resumo',
            size: 'wide' as const,
            data: {
              counters: [
                { key: 'resumes', label: 'Currículos', value: data.counts.resumes },
                { key: 'applications', label: 'Aplicações', value: data.counts.applications },
                {
                  key: 'unreadNotifications',
                  label: 'Notificações',
                  value: data.counts.unreadNotifications,
                },
                { key: 'followers', label: 'Seguidores', value: data.counts.followers },
                { key: 'following', label: 'Seguindo', value: data.counts.following },
              ],
            },
          },
          {
            id: 'recent-notifications',
            type: 'list' as const,
            title: 'Atividade recente',
            size: 'half' as const,
            data: { items: data.recentNotifications },
            cta: { label: 'Ver todas', href: '/social/notifications' },
          },
          {
            id: 'follow-ups',
            type: 'counter' as const,
            title: 'Aplicações para acompanhar',
            size: 'half' as const,
            data: { count: data.pendingFollowUps },
            cta: { label: 'Ver aplicações', href: '/careers/browse-jobs/applications' },
          },
        ],
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/pages/settings/:section',
    auth: { kind: 'jwt' },
    params: SettingsSectionParams,
    response: SettingsSectionResponseSchema,
    openapi: {
      summary: 'Server-driven settings section (fields + actions + info)',
      tags: ['pages'],
      description:
        'Returns `{section, fields:[...], actions:[...], info:[...]}`. The frontend renders settings pages from this payload — adding a setting field or action is a backend-only change.',
    },
    sdk: { exported: true },
    handler: async (ctx) => {
      const { section } = ctx.params as z.infer<typeof SettingsSectionParams>;
      return buildSettingsSection(section, {
        userId: ctx.user!.userId,
        email: ctx.user!.email,
      });
    },
  },
];
