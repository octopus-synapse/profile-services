/**
 * Route descriptors for the platform-events submodule. Replaces
 * `PlatformEventsController`. Bundle token is the
 * `TrackPlatformEventsUseCase` itself since this submodule has a
 * single use-case dependency surface.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { TrackPlatformEventsUseCase } from './application/use-cases/track-platform-events/track-platform-events.use-case';
import {
  EVENT_CATALOG,
  PlatformEventCatalogResponseSchema,
  TrackEventsBodySchema,
  TrackEventsResponseSchema,
} from './platform-events.routes.schemas';

export const platformEventsRoutes: ReadonlyArray<Route<TrackPlatformEventsUseCase>> = [
  {
    method: 'GET',
    path: '/v1/events/schemas',
    auth: { kind: 'jwt' },
    response: PlatformEventCatalogResponseSchema,
    openapi: {
      summary: 'Catalog of allowed analytics events',
      tags: ['platform-events'],
      description:
        'Returns `{events:[{name,version,propsSchema,requiredContext?,piiFields?}]}`. The frontend uses this to know which event names + prop shapes are valid before emitting.',
    },
    sdk: { exported: true },
    handler: async () => ({
      events: EVENT_CATALOG.map((e) => ({ ...e })),
    }),
  },
  {
    method: 'POST',
    path: '/v1/events',
    auth: { kind: 'jwt' },
    body: TrackEventsBodySchema,
    response: TrackEventsResponseSchema,
    openapi: {
      summary: 'Ingest a batch of product events',
      tags: ['platform-events'],
      description:
        'Accepts up to 100 events per request. Events are stored as-is; props is free-form JSON. The expected event names + shapes are listed by `/v1/events/schemas`.',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase) => {
      const body = ctx.body as z.infer<typeof TrackEventsBodySchema>;
      return useCase.execute(ctx.user!.userId ?? null, body);
    },
  },
];
