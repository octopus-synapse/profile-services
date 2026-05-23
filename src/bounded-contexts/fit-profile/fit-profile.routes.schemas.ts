/**
 * Route descriptors for the fit-profile BC. Replaces
 * `AdminFitQuestionsController`, `FitProfileController`, and
 * `JobFitProfileController`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { FIT_DIMENSIONS, QUESTION_SET_SIZE } from './domain/types';

export const IdParam = IdParamSchema;
// Param name aligned with `jobs.routes.ts` (`:id`) so both BCs can
// coexist on the same Elysia router (memoirist rejects parameter-name
// divergence at a shared path prefix).
export const JobIdParam = IdParamSchema;

export const CreateFitQuestionSchema = z
  .object({
    key: z.string().min(1).max(120),
    dimension: z.enum(FIT_DIMENSIONS),
    textEn: z.string().min(1),
    textPtBr: z.string().min(1),
    scaleType: z.enum(['likert5', 'binary']),
    weight: z.number().positive().default(1),
    isActive: z.boolean().default(true),
    reverseScored: z.boolean().default(false),
  })
  .openapi({
    example: {
      key: 'openness_curiosity_v1',
      dimension: 'BIG_FIVE_OPENNESS',
      textEn: 'I enjoy exploring new ideas and concepts.',
      textPtBr: 'Gosto de explorar novas ideias e conceitos.',
      scaleType: 'likert5',
      weight: 1,
      isActive: true,
      reverseScored: false,
    },
  });

export const UpdateFitQuestionSchema = z
  .object({
    dimension: z.enum(FIT_DIMENSIONS).optional(),
    textEn: z.string().min(1).optional(),
    textPtBr: z.string().min(1).optional(),
    scaleType: z.enum(['likert5', 'binary']).optional(),
    weight: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    reverseScored: z.boolean().optional(),
  })
  .openapi({
    example: {
      textEn: 'Updated question text in English.',
      isActive: false,
    },
  });

export const FitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  rawValue: z.number().int().min(0).max(5),
});

export const SubmitFitAnswersSchema = z
  .object({
    questionSetId: z.string().uuid(),
    answers: z.array(FitAnswerSchema).length(QUESTION_SET_SIZE),
  })
  .openapi({
    example: {
      questionSetId: '019e0391-20f3-737f-a14d-4082bcab7238',
      answers: [
        { questionId: '019df8b0-d678-738d-a9c6-608c6d944ef6', rawValue: 3 },
        { questionId: '019df8b0-d688-7b06-853b-2ac3096ea143', rawValue: 4 },
        { questionId: '019df8b0-d68f-7085-8f15-18c3e1f6cb38', rawValue: 5 },
        { questionId: '019df8b0-d6a0-7d0e-a3c5-27254be0e399', rawValue: 2 },
        { questionId: '019df8b0-d6a7-74e3-8f0e-93e23002838a', rawValue: 1 },
        { questionId: '019df8b0-d676-7620-90d2-95346177b4cf', rawValue: 3 },
        { questionId: '019df8b0-d686-78f1-8fda-59ccebeaaf44', rawValue: 4 },
        { questionId: '019df8b0-d6b5-789a-8de7-785d1fc552e6', rawValue: 5 },
        { questionId: '019df8b0-d6c1-7f78-8144-199144b87ed1', rawValue: 2 },
        { questionId: '019df8b0-d6c8-7df3-a0cf-048dd8dce3d2', rawValue: 1 },
        { questionId: '019df8b0-d6d6-7d7d-a371-95abdfe1dca5', rawValue: 3 },
        { questionId: '019df8b0-d6dc-7dcc-89c9-3c343f82ba0d', rawValue: 4 },
        { questionId: '019df8b0-d6eb-769a-877a-cc8aa42d67c3', rawValue: 5 },
        { questionId: '019df8b0-d6f6-7a5b-9c0f-f8b9cb9f874b', rawValue: 2 },
        { questionId: '019df8b0-d6ff-7ee3-a3ff-48f24300f59a', rawValue: 1 },
        { questionId: '019df8b0-d708-7953-a5e2-b3b0a2564bb0', rawValue: 3 },
        { questionId: '019df8b0-d716-7a83-8a58-57cf46b429da', rawValue: 4 },
        { questionId: '019df8b0-d6b7-701e-84e9-aca3d1ef6973', rawValue: 5 },
        { questionId: '019df8b0-d6ba-7183-b5f0-ea70b5db7cf6', rawValue: 2 },
        { questionId: '019df8b0-d6c6-7690-8ab1-0e4ca8c86c49', rawValue: 1 },
        { questionId: '019df8b0-d719-765e-95c5-bc4a547b5746', rawValue: 3 },
        { questionId: '019df8b0-d72b-7d56-88c6-44309c05e068', rawValue: 4 },
        { questionId: '019df8b0-d736-75b9-9031-d486e9404e6b', rawValue: 5 },
        { questionId: '019df8b0-d720-7080-bcc6-fa84c3cd75d4', rawValue: 2 },
        { questionId: '019df8b0-d728-7da4-ad78-526a792ee4b9', rawValue: 1 },
      ],
    },
  });

export const SliderMapSchema = z.record(z.enum(FIT_DIMENSIONS), z.number().min(0).max(1));

export const UpsertJobFitProfileSchema = z.object({ sliders: SliderMapSchema }).openapi({
  example: {
    sliders: {
      BIG_FIVE_OPENNESS: 0.8,
      BIG_FIVE_CONSCIENTIOUSNESS: 0.7,
      SDT_AUTONOMY: 0.6,
    },
  },
});

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
  questionSetId: z.string().uuid(),
  seed: z.string(),
  createdAt: IsoDateTimeSchema,
  questions: z.array(FitQuestionItemSchema),
});

export const SubmittedFitProfileResponseSchema = z.object({
  profileId: z.string().uuid(),
  version: z.number().int().min(1),
  computedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});

export const JobFitProfileResponseSchema = z.object({
  id: z.string(),
  jobId: z.string().uuid(),
  editedByUserId: z.string().uuid(),
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

export const FitAnswerHistoryItemSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  questionSetId: z.string().uuid(),
  rawValue: z.number().int().min(0).max(5),
  answeredAt: IsoDateTimeSchema,
});

export const FitAnswerHistoryResponseSchema = z.object({
  items: z.array(FitAnswerHistoryItemSchema),
});

export const EmptyResponseSchema = z.null();
