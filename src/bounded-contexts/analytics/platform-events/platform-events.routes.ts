/**
 * Route descriptors for the platform-events submodule. Replaces
 * `PlatformEventsController`. Bundle token is the
 * `TrackPlatformEventsUseCase` itself since this submodule has a
 * single use-case dependency surface.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { TrackPlatformEventsUseCase } from './application/use-cases/track-platform-events/track-platform-events.use-case';

const PlatformEventSchema = z.object({
  event: z.string().min(1).max(120),
  props: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});

const TrackEventsBodySchema = z.object({
  events: z.array(PlatformEventSchema).min(1).max(100),
});

export const platformEventsRoutes: ReadonlyArray<Route<TrackPlatformEventsUseCase>> = [
  {
    method: 'POST',
    path: '/v1/events',
    auth: { kind: 'jwt' },
    body: TrackEventsBodySchema,
    openapi: {
      summary: 'Ingest a batch of product events',
      tags: ['platform-events'],
      description:
        'Accepts up to 100 events per request. Events are stored as-is; props is free-form JSON.',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase) => {
      const body = ctx.body as z.infer<typeof TrackEventsBodySchema>;
      return useCase.execute(ctx.user?.userId ?? null, body);
    },
  },
];
