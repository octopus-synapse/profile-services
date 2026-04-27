/**
 * Route descriptors for the recruiting BC. Replaces
 * `MatchCandidatesController`. The per-route rate-limit (`@RateLimit()`
 * + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { MatchCandidatesForJobOutput } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';

export { RATE_LIMIT_KEY };

const MatchCandidatesRequestSchema = z.object({
  jobTitle: z.string().max(200).optional(),
  jobDescription: z.string().max(20_000).optional(),
  skills: z.array(z.string().min(1).max(60)).max(40).optional(),
  minEnglishLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']).optional(),
  remotePolicy: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

type MatchCandidatesRequest = z.infer<typeof MatchCandidatesRequestSchema>;

export const recruitingRoutes: ReadonlyArray<Route<MatchCandidatesForJobPort>> = [
  {
    method: 'POST',
    path: '/v1/recruiting/match-candidates',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: MatchCandidatesRequestSchema,
    statusCode: 200,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 20, duration: 3600, keyStrategy: 'user' },
      },
    ],
    openapi: {
      summary:
        'Rank up-to-N opt-in candidates for a job description using the same structured fit-score model used on the candidate side (reverse match).',
      tags: ['recruiting'],
      description: 'Reverse candidate match API',
    },
    sdk: { exported: true },
    handler: async (
      ctx,
      useCase,
    ): Promise<{ success: true; data: MatchCandidatesForJobOutput }> => {
      const body = ctx.body as MatchCandidatesRequest;
      const data = await useCase.execute({
        requesterId: ctx.user!.userId,
        jobSkills: body.skills ?? [],
        jobMinEnglish: body.minEnglishLevel ?? null,
        jobRemotePolicy: body.remotePolicy ?? null,
        limit: body.limit,
      });
      return { success: true, data };
    },
  },
];
