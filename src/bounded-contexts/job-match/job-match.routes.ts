/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token here is `ComputeMatchUseCase` itself — this BC has a
 * single use case so we don't need an aggregate bundle.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { ComputeMatchRequestDto } from './dto/match-breakdown.schema';
import {
  toJobMatchSimpleResponseDto,
  toMatchBreakdownResponseDto,
} from './infrastructure/presenters/match-breakdown.presenter';
import {
  ComputeMatchSchema,
  JobIdParams,
  JobMatchByJobBodySchema,
  JobMatchSimpleResponseSchema,
  MatchBreakdownResponseSchema,
  pickUserId,
  ResumeJobParams,
} from './job-match.routes.schemas';

export const jobMatchRoutes: ReadonlyArray<Route<ComputeMatchUseCase>> = [
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
    handler: async (ctx, compute) => {
      const body = ctx.body as ComputeMatchRequestDto;
      const breakdown = await compute.execute({
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
    handler: async (ctx, compute) => {
      const { resumeId, jobId } = ctx.params as { resumeId: string; jobId: string };
      const breakdown = await compute.execute({
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
    handler: async (ctx, compute) => {
      const { id: jobId } = ctx.params as { id: string };
      const body = ctx.body as { resumeId: string };
      const breakdown = await compute.execute({
        userId: pickUserId(ctx),
        resumeId: body.resumeId,
        jobId,
      });
      return toJobMatchSimpleResponseDto(breakdown);
    },
  },
];
