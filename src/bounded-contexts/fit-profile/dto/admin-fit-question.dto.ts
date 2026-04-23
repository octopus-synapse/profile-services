import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FIT_DIMENSIONS } from '../domain/types';

const CreateFitQuestionSchema = z.object({
  key: z.string().min(1).max(120),
  dimension: z.enum(FIT_DIMENSIONS),
  textEn: z.string().min(1),
  textPtBr: z.string().min(1),
  scaleType: z.enum(['likert5', 'binary']),
  weight: z.number().positive().default(1),
  isActive: z.boolean().default(true),
  reverseScored: z.boolean().default(false),
});

export class CreateFitQuestionDto extends createZodDto(CreateFitQuestionSchema) {}

const UpdateFitQuestionSchema = z.object({
  dimension: z.enum(FIT_DIMENSIONS).optional(),
  textEn: z.string().min(1).optional(),
  textPtBr: z.string().min(1).optional(),
  scaleType: z.enum(['likert5', 'binary']).optional(),
  weight: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  reverseScored: z.boolean().optional(),
});

export class UpdateFitQuestionDto extends createZodDto(UpdateFitQuestionSchema) {}

const FitQuestionResponseSchema = z.object({
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

export class FitQuestionResponseDto extends createZodDto(FitQuestionResponseSchema) {}

const FitQuestionListResponseSchema = z.object({
  items: z.array(FitQuestionResponseSchema),
});

export class FitQuestionListResponseDto extends createZodDto(FitQuestionListResponseSchema) {}
