import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ScoreRankSchema } from '@/shared-kernel/scoring';

const TrendPointSchema = z.object({
  score: z.number().int().min(0).max(100),
  at: IsoDateTimeSchema,
});

const ReadinessScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rank: ScoreRankSchema,
  factors: z.object({
    quality: z.number().int().min(0).max(100).nullable().openapi({ example: 82 }),
    coverage: z.number().int().min(0).max(100).nullable().openapi({ example: 74 }),
    fit: z.number().int().min(0).max(100).nullable(),
  }),
  trend: z.array(TrendPointSchema),
});

const QualityScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rank: ScoreRankSchema,
  completenessScore: z.number().int().min(0).max(100),
  contentQualityScore: z.number().int().min(0).max(100).nullable(),
  computedAt: IsoDateTimeSchema,
  trend: z.array(TrendPointSchema),
});

const StyleScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rank: ScoreRankSchema,
});

const FitScoreSchema = z.object({
  /** `responded` = valid vector, `expired` = past the 180-day window,
   * `never` = questionnaire not taken. */
  status: z.enum(['never', 'responded', 'expired']),
  expiresAt: IsoDateTimeSchema.nullable(),
});

/**
 * Unified scores payload for the master resume. `rank` at the top level
 * is the headline grade (from Readiness). Each job-independent score is
 * present unless the underlying data doesn't exist yet (nullable), so
 * the client renders a cold-start state instead of erroring.
 */
export const MeScoresResponseSchema = z.object({
  resumeId: z.string().nullable(),
  rank: ScoreRankSchema,
  readiness: ReadinessScoreSchema,
  quality: QualityScoreSchema.nullable(),
  style: StyleScoreSchema.nullable(),
  fit: FitScoreSchema,
});

export type MeScoresResponseDto = z.infer<typeof MeScoresResponseSchema>;
