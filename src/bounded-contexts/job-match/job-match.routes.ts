/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token is `JobMatchBundle` — the BC now owns the Match Score,
 * the Readiness Score, and the unified `/v1/me/scores` aggregator.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ResumeIdParamSchema } from '@/shared-kernel/schemas/params/resume-id-param.schema';
import { ComputeMatchRequestDto } from './dto/match-breakdown.schema';
import { MeScoresResponseSchema } from './dto/me-scores.schema';
import {
  toJobMatchSimpleResponseDto,
  toMatchBreakdownResponseDto,
} from './infrastructure/presenters/match-breakdown.presenter';
import { toMeScoresResponseDto } from './infrastructure/presenters/me-scores.presenter';
import type { JobMatchBundle } from './job-match.bundle';
import {
  ComputeMatchSchema,
  JobIdParams,
  JobMatchByJobBodySchema,
  JobMatchSimpleResponseSchema,
  MatchBreakdownResponseSchema,
  pickUserId,
  ResumeJobParams,
} from './job-match.routes.schemas';

export const jobMatchRoutes: ReadonlyArray<Route<JobMatchBundle>> = [
  {
    method: 'POST',
    path: '/v1/match',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: ComputeMatchSchema,
    response: MatchBreakdownResponseSchema,
    openapi: {
      summary: 'Compute the Match Score for a (resume, job) pair',
      tags: ['job-match'],
      description: 'Match Score API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const body = ctx.body as ComputeMatchRequestDto;
      const breakdown = await bundle.computeMatch.execute({
        userId: pickUserId(ctx),
        resumeId: body.resumeId,
        jobId: body.jobId,
      });
      return toMatchBreakdownResponseDto(breakdown);
    },
  },
  {
    method: 'GET',
    path: '/v1/match/:resumeId/:jobId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeJobParams,
    response: MatchBreakdownResponseSchema,
    openapi: {
      summary: 'Read the Match Score for a (resume, job) pair (cached)',
      tags: ['job-match'],
      description: 'Match Score API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId, jobId } = ctx.params as { resumeId: string; jobId: string };
      const breakdown = await bundle.computeMatch.execute({
        userId: pickUserId(ctx),
        resumeId,
        jobId,
      });
      return toMatchBreakdownResponseDto(breakdown);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/match',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: JobIdParams,
    body: JobMatchByJobBodySchema,
    response: JobMatchSimpleResponseSchema,
    openapi: {
      summary: 'Candidate-side simplified match score for a single job',
      tags: ['job-match'],
      description: 'Match Score API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { id: jobId } = ctx.params as { id: string };
      const body = ctx.body as { resumeId: string };
      const breakdown = await bundle.computeMatch.execute({
        userId: pickUserId(ctx),
        resumeId: body.resumeId,
        jobId,
      });
      return toJobMatchSimpleResponseDto(breakdown);
    },
  },
  {
    method: 'GET',
    path: '/v1/me/scores',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    response: MeScoresResponseSchema,
    openapi: {
      summary: "Unified job-independent scores for the caller's master resume",
      tags: ['job-match'],
      description:
        'Readiness + Quality + Style + Fit for the primary resume, each with its S/A/B/C/D/F rank. Cold-start safe.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const view = await bundle.getMeScores.execute(pickUserId(ctx));
      return toMeScoresResponseDto(view);
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/scores',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParamSchema,
    // Ownership: resolve resumeId → owner and reject if the caller isn't it.
    guards: [{ id: 'ownership', metadata: { entity: 'resume', paramKey: 'resumeId' } }],
    response: MeScoresResponseSchema,
    openapi: {
      summary: 'Job-independent scores for a specific resume the caller owns',
      tags: ['job-match'],
      description:
        'Readiness + Quality + Style + Fit for the given resume, each with its S/A/B/C/D/F rank. Same shape as /me/scores.',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const view = await bundle.getMeScores.executeForResume(pickUserId(ctx), resumeId);
      return toMeScoresResponseDto(view);
    },
  },
];
