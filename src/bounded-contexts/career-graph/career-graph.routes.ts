/**
 * Route descriptors for the career-graph BC. Replaces
 * `ViewCareerGraphController`. The per-route rate-limit
 * (`@RateLimit()` + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';
import type { Route } from '@/shared-kernel/http/route';
import type { ViewCareerGraphOutput } from './application';
import { CareerGraphUseCases } from './application/ports/career-graph.port';

export { RATE_LIMIT_KEY };

const ViewCareerGraphRequestSchema = z.object({
  stack: z.array(z.string().min(1).max(60)).min(1).max(40),
  maxBuckets: z.number().int().min(1).max(40).default(20),
});

type ViewCareerGraphRequest = z.infer<typeof ViewCareerGraphRequestSchema>;

export const careerGraphRoutes: ReadonlyArray<Route<CareerGraphUseCases>> = [
  {
    method: 'POST',
    path: '/v1/career-graph/view',
    auth: { kind: 'jwt' },
    body: ViewCareerGraphRequestSchema,
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
    handler: async (ctx, bc): Promise<{ success: true; data: ViewCareerGraphOutput }> => {
      const body = ctx.body as ViewCareerGraphRequest;
      const data = await bc.viewCareerGraph.execute({
        requesterId: ctx.user!.userId,
        stack: body.stack,
        maxBuckets: body.maxBuckets,
      });
      return { success: true, data };
    },
  },
];
