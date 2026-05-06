/**
 * Route descriptors for the job-match BC. Replaces `JobMatchController`.
 * The bundle token here is `ComputeMatchUseCase` itself — this BC has a
 * single use case so we don't need an aggregate bundle.
 */

import { z } from 'zod';
import { JobMatchAuthenticatedUserMissingException } from './domain/exceptions/job-match.exceptions';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  resumeId: z.string(),
  jobId: z.string(),
});

export const ComputeMatchSchema = z.object({
  resumeId: z.string().min(1),
  jobId: z.string().min(1),
});

export function pickUserId(ctx: { user: { userId: string } | null }): string {
  const id = ctx.user?.userId;
  if (!id) throw new JobMatchAuthenticatedUserMissingException();
  return id;
}
