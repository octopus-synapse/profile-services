/**
 * Route descriptors for the recruiting BC. Replaces
 * `MatchCandidatesController`. The per-route rate-limit (`@RateLimit()`
 * + `@UseGuards(RateLimitGuard)`) is expressed via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`; the BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import type { MatchCandidatesForJobOutput } from './application';
import { MatchCandidatesForJobPort } from './application/ports/match-candidates.inbound-port';
import {
  JOB_FORM_CONFIG,
  JobFormConfigResponseSchema,
  MatchCandidatesRequest,
  MatchCandidatesRequestSchema,
  MatchCandidatesResponseSchema,
} from './recruiting.routes.schemas';

export const recruitingRoutes: ReadonlyArray<Route<MatchCandidatesForJobPort>> = [
  {
    method: 'GET',
    path: '/v1/recruiting/jobs/form-config',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    response: JobFormConfigResponseSchema,
    openapi: {
      summary: 'Server-driven config for the create/edit-job wizard',
      tags: ['recruiting'],
      description:
        'Returns `{steps:[{id,label,fields:[...]}], options:{...}}`. The frontend iterates `steps[]` and renders inputs from each `field`. Adding a step or field is a backend-only change.',
    },
    sdk: { exported: true },
    // No use-case dependency — config is static today.
    handler: async () => ({
      steps: JOB_FORM_CONFIG.steps,
      options: JOB_FORM_CONFIG.options,
    }),
  },
  {
    method: 'POST',
    path: '/v1/recruiting/match-candidates',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: MatchCandidatesRequestSchema,
    statusCode: 200,
    response: MatchCandidatesResponseSchema,
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
    handler: async (ctx, useCase): Promise<MatchCandidatesForJobOutput> => {
      const body = ctx.body as MatchCandidatesRequest;
      return useCase.execute({
        requesterId: ctx.user!.userId,
        jobSkills: body.skills ?? [],
        jobMinEnglish: body.minEnglishLevel ?? null,
        jobRemotePolicy: body.remotePolicy ?? null,
        limit: body.limit,
      });
    },
  },
];
