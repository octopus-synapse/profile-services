/**
 * Route descriptors for the career-graph BC. Replaces
 * `ViewCareerGraphController`. The per-route rate-limit
 * (`@RateLimit()` + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { CareerGraphUseCases } from './application/ports/career-graph.port';
import {
  ViewCareerGraphRequest,
  ViewCareerGraphRequestSchema,
  ViewCareerGraphResponseSchema,
} from './career-graph.routes.schemas';

export const careerGraphRoutes: ReadonlyArray<Route<CareerGraphUseCases>> = [
  {
    method: 'POST',
    path: '/v1/career-graph/view',
    auth: { kind: 'jwt' },
    body: ViewCareerGraphRequestSchema,
    response: ViewCareerGraphResponseSchema,
    statusCode: 200,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 30, duration: 3600, keyStrategy: 'user' },
      },
    ],
    openapi: {
      summary:
        'Aggregate opt-in peers who share ≥60% of the requested stack into experienceYears buckets; returns current bucket + 3/5/10y projections.',
      tags: ['career-graph'],
      description: 'Career cohort projection API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as ViewCareerGraphRequest;
      return bc.viewCareerGraph.execute({
        requesterId: ctx.user!.userId,
        stack: body.stack,
        maxBuckets: body.maxBuckets,
      });
    },
  },
];
