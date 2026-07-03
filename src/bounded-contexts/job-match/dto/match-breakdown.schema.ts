import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ScoreRankSchema } from '@/shared-kernel/scoring';

const SubScoreSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  detail: z.record(z.unknown()).optional(),
});

const MatchBreakdownSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  /** Letter grade for `overallScore` (S/A/B/C/D/F), from the shared ladder. */
  rank: ScoreRankSchema,
  subScores: z.object({
    keyword: SubScoreSchema,
    requirements: SubScoreSchema,
    semantic: SubScoreSchema,
    fit: SubScoreSchema,
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
const ComputeMatchRequestSchema = z.object({
  resumeId: z.string().min(1),
  jobId: z.string().min(1),
});

export type SubScoreDto = z.infer<typeof SubScoreSchema>;

export type MatchBreakdownDto = z.infer<typeof MatchBreakdownSchema>;

export type ComputeMatchRequestDto = z.infer<typeof ComputeMatchRequestSchema>;
