import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const SubScoreSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  detail: z.record(z.unknown()).optional(),
});

const MatchBreakdownSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
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

export class MatchBreakdownDto extends createZodDto(MatchBreakdownSchema) {}

const ComputeMatchRequestSchema = z.object({
  resumeId: z.string().min(1),
  jobId: z.string().min(1),
});

export class ComputeMatchRequestDto extends createZodDto(ComputeMatchRequestSchema) {}
