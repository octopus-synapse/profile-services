/**
 * Route descriptors for the fit-profile BC. Replaces
 * `AdminFitQuestionsController`, `FitProfileController`, and
 * `JobFitProfileController`.
 */

import { z } from 'zod';
import { FIT_DIMENSIONS, QUESTION_SET_SIZE } from './domain/types';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const IdParam = IdParamSchema;
// Param name aligned with `jobs.routes.ts` (`:id`) so both BCs can
// coexist on the same Elysia router (memoirist rejects parameter-name
// divergence at a shared path prefix).
export const JobIdParam = IdParamSchema;

export const CreateFitQuestionSchema = z.object({
  key: z.string().min(1).max(120),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string().min(1),
  textPtBr: z.string().min(1),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number().positive().default(1),
  isActive: z.boolean().default(true),
  reverseScored: z.boolean().default(false),
});

export const UpdateFitQuestionSchema = z.object({
  dimension: z.enum(FIT_DIMENSIONS).optional(),
  textEn: z.string().min(1).optional(),
  textPtBr: z.string().min(1).optional(),
  scaleType: z.enum(['likert5', 'binary']).optional(),
  weight: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  reverseScored: z.boolean().optional(),
});

export const FitAnswerSchema = z.object({
  questionId: z.string(),
  rawValue: z.number().int().min(0).max(5),
});

export const SubmitFitAnswersSchema = z.object({
  questionSetId: z.string(),
  answers: z.array(FitAnswerSchema).length(QUESTION_SET_SIZE),
});

export const SliderMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

export const UpsertJobFitProfileSchema = z.object({ sliders: SliderMapSchema });

// ─── Response schemas ─────────────────────────────────────────────────
export const DimensionScoreMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

export const FitVectorSchema = z.object({
  bigFive: DimensionScoreMapSchema,
  schwartz: DimensionScoreMapSchema,
  sdt: DimensionScoreMapSchema,
});

export const FitProfileMeResponseSchema = z.object({
  status: z.enum(['never', 'responded', 'expired']),
  vector: FitVectorSchema.nullable(),
  answeredAt: IsoDateTimeSchema.nullable(),
  expiresAt: IsoDateTimeSchema.nullable(),
  remainingQuestions: z.union([z.literal(0), z.literal(QUESTION_SET_SIZE)]),
});

export const FitQuestionItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string(),
  textPtBr: z.string(),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number(),
});

export const FitQuestionsResponseSchema = z.object({
  questionSetId: z.string(),
  seed: z.string(),
  createdAt: IsoDateTimeSchema,
  questions: z.array(FitQuestionItemSchema),
});

export const SubmittedFitProfileResponseSchema = z.object({
  profileId: z.string(),
  version: z.number().int().min(1),
  computedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});

export const JobFitProfileResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  editedByUserId: z.string(),
  computedAt: IsoDateTimeSchema,
  vector: FitVectorSchema,
});

export const FitQuestionResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string(),
  textPtBr: z.string(),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number(),
  isActive: z.boolean(),
  reverseScored: z.boolean(),
});

export const FitQuestionListResponseSchema = z.object({
  items: z.array(FitQuestionResponseSchema),
});

export const EmptyResponseSchema = z.null();
