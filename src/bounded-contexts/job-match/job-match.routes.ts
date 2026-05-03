/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token here is `ComputeMatchUseCase` itself — this BC has a
 * single use case so we don't need an aggregate bundle.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ComputeMatchUseCase } from './application/use-cases/compute-match.use-case';
import { JobMatchAuthenticatedUserMissingException } from './domain/exceptions/job-match.exceptions';
import { ComputeMatchRequestDto } from './dto/match-breakdown.schema';
import { presentMatchBreakdown } from './infrastructure/presenters/match-breakdown.presenter';

const ScoreField = z.number().int().min(0).max(100).nullable();

const KeywordSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      matched: z.array(z.string()),
      missing: z.array(z.string()),
    })
    .optional(),
});

const RequirementsSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      matchedSlots: z.array(z.string()),
      missingSlots: z.array(z.string()),
    })
    .optional(),
});

const SemanticSubScoreSchema = z.object({
  score: ScoreField,
});

const FitSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      culture: z.number().nullable().optional(),
      role: z.number().nullable().optional(),
    })
    .optional(),
});

const MatchBreakdownResponseSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  subScores: z.object({
    keyword: KeywordSubScoreSchema,
    requirements: RequirementsSubScoreSchema,
    semantic: SemanticSubScoreSchema,
    fit: FitSubScoreSchema,
  }),
  effectiveWeights: z.object({
    keyword: z.number().min(0).max(1),
    requirements: z.number().min(0).max(1),
    semantic: z.number().min(0).max(1),
    fit: z.number().min(0).max(1),
  }),
  rulesVersion: z.string(),
  computedAt: z.string().datetime(),
});

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
      return presentMatchBreakdown(breakdown);
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
      return presentMatchBreakdown(breakdown);
    },
  },
];
