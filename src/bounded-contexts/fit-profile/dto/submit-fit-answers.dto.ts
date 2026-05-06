import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { QUESTION_SET_SIZE } from '../domain/types';

const FitAnswerSchema = z.object({
  questionId: z.string(),
  rawValue: z.number().int().min(0).max(5),
});

const SubmitFitAnswersSchema = z.object({
  questionSetId: z.string(),
  answers: z.array(FitAnswerSchema).length(QUESTION_SET_SIZE),
});

export class SubmitFitAnswersDto extends createZodDto(SubmitFitAnswersSchema) {}

const SubmittedFitProfileSchema = z.object({
  profileId: z.string(),
  version: z.number().int().min(1),
  computedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});

export class SubmittedFitProfileResponseDto extends createZodDto(SubmittedFitProfileSchema) {}
