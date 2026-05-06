import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { FIT_DIMENSIONS, QUESTION_SET_SIZE } from '../domain/types';

/** Per-dimension [0,1] score map; missing dimensions are absent. */
const DimensionScoreMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

const FitVectorSchema = z.object({
  bigFive: DimensionScoreMapSchema,
  schwartz: DimensionScoreMapSchema,
  sdt: DimensionScoreMapSchema,
});

const FitProfileMeSchema = z.object({
  status: z.enum(['never', 'responded', 'expired']),
  vector: FitVectorSchema.nullable(),
  answeredAt: IsoDateTimeSchema.nullable(),
  expiresAt: IsoDateTimeSchema.nullable(),
  remainingQuestions: z.union([z.literal(0), z.literal(QUESTION_SET_SIZE)]),
});

export class FitProfileMeResponseDto extends createZodDto(FitProfileMeSchema) {}
