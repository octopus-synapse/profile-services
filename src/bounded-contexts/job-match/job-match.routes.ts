/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token here is `ComputeMatchUseCase` itself — this BC has a
 * single use case so we don't need an aggregate bundle.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { JobMatchAuthenticatedUserMissingException } from './domain/exceptions/job-match.exceptions';
import { ComputeMatchRequestDto } from './dto/match-breakdown.dto';
import { presentMatchBreakdown } from './infrastructure/presenters/match-breakdown.presenter';

const ResumeJobParams = z.object({
  resumeId: z.string(),
  jobId: z.string(),
});

const ComputeMatchSchema = z.object({
  resumeId: z.string().min(1),
  jobId: z.string().min(1),
});

function pickUserId(ctx: { user: { userId: string } | null }): string {
  const id = ctx.user!.userId;
  if (!id) throw new JobMatchAuthenticatedUserMissingException();
  return id;
}

export const jobMatchRoutes: ReadonlyArray<Route<ComputeMatchUseCase>> = [
  {
    method: 'POST',
    path: '/v1/match',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    body: ComputeMatchSchema,
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
      return presentMatchBreakdown(breakdown);
    },
  },
  {
    method: 'GET',
    path: '/v1/match/:resumeId/:jobId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeJobParams,
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
      return presentMatchBreakdown(breakdown);
    },
  },
];
