import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// --- OnboardingStep ---

const OnboardingStepSchema = z.object({
  id: z.string(),
  key: z.string(),
  order: z.number().int(),
  component: z.string(),
  icon: z.string(),
  required: z.boolean(),
  sectionTypeKey: z.string().nullable(),
  fields: z.unknown(),
  translations: z.unknown(),
  validation: z.unknown(),
  strengthWeight: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const OnboardingStepListDataSchema = z.object({
  steps: z.array(OnboardingStepSchema),
});

const OnboardingStepDataSchema = z.object({
  step: OnboardingStepSchema,
});

// --- OnboardingStats ---

const DropOffByStepSchema = z.record(z.string(), z.number());

const OnboardingStatsSchema = z.object({
  totalStarted: z.number().int(),
  totalCompleted: z.number().int(),
  completionRate: z.number().int(),
  dropOffByStep: DropOffByStepSchema,
});

const OnboardingStatsDataSchema = z.object({
  stats: OnboardingStatsSchema,
});

// --- OnboardingConfig ---

const OnboardingConfigSchema = z.object({
  id: z.string(),
  key: z.string(),
  strengthLevels: z.unknown(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const OnboardingConfigDataSchema = z.object({
  config: OnboardingConfigSchema.nullable(),
});

// --- DTOs ---

export class OnboardingStepListDataDto extends createZodDto(OnboardingStepListDataSchema) {}
export class OnboardingStepDataDto extends createZodDto(OnboardingStepDataSchema) {}
export class OnboardingStatsDataDto extends createZodDto(OnboardingStatsDataSchema) {}
export class OnboardingConfigDataDto extends createZodDto(OnboardingConfigDataSchema) {}
