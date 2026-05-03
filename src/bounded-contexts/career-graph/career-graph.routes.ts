/**
 * Route descriptors for the career-graph BC. Replaces
 * `ViewCareerGraphController`. The per-route rate-limit
 * (`@RateLimit()` + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';
import type { Route } from '@/shared-kernel/http/route.types';
import { CareerGraphUseCases } from './application/ports/career-graph.port';

export { RATE_LIMIT_KEY };

const ViewCareerGraphRequestSchema = z.object({
  stack: z.array(z.string().min(1).max(60)).min(1).max(40),
  maxBuckets: z.number().int().min(1).max(40).default(20),
});

type ViewCareerGraphRequest = z.infer<typeof ViewCareerGraphRequestSchema>;

const CareerGraphBucketSchema = z.object({
  experienceYears: z.number().int().min(0),
  peerCount: z.number().int().min(0),
  topJobTitles: z.array(z.object({ title: z.string(), count: z.number().int().min(0) })),
});

const ViewCareerGraphResponseSchema = z.object({
  stack: z.array(z.string()),
  user: z.object({ experienceYears: z.number(), jobTitle: z.string().nullable() }),
  totalPeers: z.number().int().min(0),
  current: CareerGraphBucketSchema.nullable(),
  buckets: z.array(CareerGraphBucketSchema),
  projections: z.array(
    z.object({
      yearsAhead: z.number().int(),
      bucket: CareerGraphBucketSchema.nullable(),
    }),
  ),
});

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
