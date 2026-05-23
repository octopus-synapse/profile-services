/**
 * Route descriptors for the career-graph BC. Replaces
 * `ViewCareerGraphController`. The per-route rate-limit
 * (`@RateLimit()` + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';

export { RATE_LIMIT_KEY };

export const ViewCareerGraphRequestSchema = z
  .object({
    stack: z.array(z.string().min(1).max(60)).min(1).max(40),
    maxBuckets: z.number().int().min(1).max(40).default(20),
  })
  .openapi({
    example: {
      stack: ['typescript', 'postgresql', 'aws', 'kubernetes'],
      maxBuckets: 20,
    },
  });

export type ViewCareerGraphRequest = z.infer<typeof ViewCareerGraphRequestSchema>;

export const CareerGraphBucketSchema = z.object({
  experienceYears: z.number().int().min(0),
  peerCount: z.number().int().min(0),
  topJobTitles: z.array(z.object({ title: z.string(), count: z.number().int().min(0) })),
});

export const ViewCareerGraphResponseSchema = z.object({
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
