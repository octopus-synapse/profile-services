import { z } from 'zod';
import type {
  OnboardingStepField,
  OnboardingStepTranslation,
  OnboardingStepValidation,
  StrengthLevel,
} from '../../domain/ports/onboarding-config.port';

const onboardingStepFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  widget: z.string().optional(),
  required: z.boolean(),
  examples: z.array(z.string()).optional(),
});

const onboardingStepTranslationSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  fieldLabels: z.record(z.string(), z.string()).optional(),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
});

const onboardingStepValidationSchema = z.object({
  requiredFields: z.array(z.string()).optional(),
  minLength: z.record(z.string(), z.number()).optional(),
  maxLength: z.record(z.string(), z.number()).optional(),
});

const strengthLevelSchema = z.object({
  minScore: z.number(),
  level: z.string(),
  message: z.string(),
});

export const onboardingStepFieldsSchema = z.array(onboardingStepFieldSchema).catch([]);

export const onboardingStepTranslationsSchema = z
  .record(z.string(), onboardingStepTranslationSchema)
  .catch({});

export const onboardingStepValidationArgSchema = onboardingStepValidationSchema.catch({});

export const strengthLevelsSchema = z.array(strengthLevelSchema).catch([]);

// Compile-time guarantee that the Zod schemas stay aligned with the port types.
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _assertField: AssertEqual<
  z.infer<typeof onboardingStepFieldSchema>,
  OnboardingStepField
> = true;
const _assertTranslation: AssertEqual<
  z.infer<typeof onboardingStepTranslationSchema>,
  OnboardingStepTranslation
> = true;
const _assertValidation: AssertEqual<
  z.infer<typeof onboardingStepValidationSchema>,
  OnboardingStepValidation
> = true;
const _assertStrengthLevel: AssertEqual<z.infer<typeof strengthLevelSchema>, StrengthLevel> = true;
void _assertField;
void _assertTranslation;
void _assertValidation;
void _assertStrengthLevel;
