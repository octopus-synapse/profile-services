/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token here is `ComputeMatchUseCase` itself — this BC has a
 * single use case so we don't need an aggregate bundle.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { JobMatchAuthenticatedUserMissingException } from './domain/exceptions/job-match.exceptions';

export const ScoreField = z.number().int().min(0).max(100).nullable();

export const KeywordSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      matched: z.array(z.string()),
      missing: z.array(z.string()),
    })
    .optional(),
});

export const RequirementsSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      matchedSlots: z.array(z.string()),
      missingSlots: z.array(z.string()),
    })
    .optional(),
});

export const SemanticSubScoreSchema = z.object({
  score: ScoreField,
});

export const FitSubScoreSchema = z.object({
  score: ScoreField,
  detail: z
    .object({
      culture: z.number().nullable().optional(),
      role: z.number().nullable().optional(),
    })
    .optional(),
});

export const MatchBreakdownResponseSchema = z.object({
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
  computedAt: IsoDateTimeSchema,
});

export const ResumeJobParams = z.object({
  resumeId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export const JobIdParams = z.object({ id: z.string().uuid() });

export const ComputeMatchSchema = z
  .object({
    resumeId: z.string().uuid(),
    jobId: z.string().uuid(),
  })
  .openapi({
    example: {
      resumeId: '01900000-0000-7000-a000-000000000010',
      jobId: '01900000-0000-7000-a000-000000000030',
    },
  });

export const JobMatchByJobBodySchema = z
  .object({
    resumeId: z.string().uuid(),
  })
  .openapi({
    example: { resumeId: '01900000-0000-7000-a000-000000000010' },
  });

export const JobMatchDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().min(0).max(1),
});

export const JobMatchSimpleResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  dimensions: z.array(JobMatchDimensionSchema),
});

export function pickUserId(ctx: { user: { userId: string } | null }): string {
  const id = ctx.user?.userId;
  if (!id) throw new JobMatchAuthenticatedUserMissingException();
  return id;
}
