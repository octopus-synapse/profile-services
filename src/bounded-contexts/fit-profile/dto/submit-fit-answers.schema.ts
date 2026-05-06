import { z } from 'zod';
import { QUESTION_SET_SIZE } from '../domain/types';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const FitAnswerSchema = z.object({
  questionId: z.string(),
  rawValue: z.number().int().min(0).max(5),
});

const SubmitFitAnswersSchema = z.object({
  questionSetId: z.string(),
  answers: z.array(FitAnswerSchema).length(QUESTION_SET_SIZE),
});
const SubmittedFitProfileSchema = z.object({
  profileId: z.string(),
  version: z.number().int().min(1),
  computedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});

export type FitAnswerDto = z.infer<typeof FitAnswerSchema>;

export type SubmitFitAnswersDto = z.infer<typeof SubmitFitAnswersSchema>;

export type SubmittedFitProfileDto = z.infer<typeof SubmittedFitProfileSchema>;
