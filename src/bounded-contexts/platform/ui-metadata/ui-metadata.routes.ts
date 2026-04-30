/**
 * Route descriptors for the ui-metadata BC. Replaces
 * `UiMetadataController` and `MeDashboardController`.
 */

import { z } from 'zod';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';

const EnumKeyParams = z.object({ key: z.string() });

export const uiMetadataRoutes: ReadonlyArray<Route<UiMetadataUseCases>> = [
  {
    method: 'GET',
    path: '/v1/enums',
    auth: { kind: 'public' },
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
    openapi: {
      summary:
        'Single payload for the dashboard: counts (resumes, applications, unread notifications), latest activity items, viewer summary. Replaces ~5 parallel UI fetches.',
      tags: ['pages'],
      description: 'Composite page payloads',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const data = await bc.loadMeDashboard.execute(ctx.user!.userId);
      return { success: true, data };
    },
  },
];
