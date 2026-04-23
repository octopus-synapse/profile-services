import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FIT_DIMENSIONS } from '../domain/types';

const FitQuestionItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string(),
  textPtBr: z.string(),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number(),
});

const FitQuestionsResponseSchema = z.object({
  questionSetId: z.string(),
  seed: z.string(),
  createdAt: z.string().datetime(),
  questions: z.array(FitQuestionItemSchema),
});

export class FitQuestionsResponseDto extends createZodDto(FitQuestionsResponseSchema) {}
