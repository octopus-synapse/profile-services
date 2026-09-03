/**
 * Route descriptors for the ui-metadata BC — the enum catalog.
 *
 * `/v1/me/menu` and `/v1/pages/*` (server-driven navigation and page
 * payloads) were removed with the rest of the surface no screen called
 * (ADR-005); the app composes its own navigation and screens.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import {
  EnumDescriptorResponseSchema,
  EnumKeyParams,
  EnumKeysResponseSchema,
} from './ui-metadata.routes.schemas';

export const uiMetadataRoutes: ReadonlyArray<Route<UiMetadataUseCases>> = [
  {
    method: 'GET',
    path: '/v1/enums',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=300' },
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
    headers: { 'Cache-Control': 'public, max-age=300' },
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
];
