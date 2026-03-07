/**
 * Onboarding Progress DTOs
 *
 * Data Transfer Objects for onboarding progress tracking.
 * Allows partial saves during the onboarding flow.
 *
 * ARCHITECTURE NOTE: These DTOs use GENERIC SECTIONS model.
 * Section-specific validation happens server-side using SectionType definitions.
 * Content schemas here are permissive to allow partial saves.
 */

import { z } from 'zod';
import {
  OnboardingSectionItemSchema,
  PersonalInfoSchema,
  TemplateSelectionSchema,
} from '../validations/onboarding-data.schema';
import { ProfessionalProfileSchema } from '../validations/professional-profile.schema';
import { UsernameSchema } from '../validations/username.schema';

const StaticOnboardingStepSchema = z.enum([
  'welcome',
  'personal-info',
  'username',
  'professional-profile',
  'template',
  'review',
  'complete',
]);

const DynamicSectionOnboardingStepSchema = z
  .string()
  .regex(
    /^section:[a-z][a-z0-9]*(_[a-z0-9]+)+$/,
    'Section steps must use the format section:<section_type_key>',
  );

/**
 * Onboarding Step
 *
 * Static onboarding flow steps plus dynamic section steps driven by SectionType.
 */
export const OnboardingStepSchema = z.union([
  StaticOnboardingStepSchema,
  DynamicSectionOnboardingStepSchema,
]);

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

/**
 * Generic Section Item Schema for Progress
 *
 * Uses permissive content schema since validation happens server-side
 * using SectionDefinitionZodFactory with SectionType.definition.
 */
const PartialSectionItemSchema = OnboardingSectionItemSchema.partial();

/**
 * Partial schemas for progress saving
 * These are more lenient than the final schemas to allow incomplete data
 */
const PartialPersonalInfoSchema = PersonalInfoSchema.partial();
const PartialProfessionalProfileSchema = ProfessionalProfileSchema.partial();
const PartialTemplateSelectionSchema = TemplateSelectionSchema.partial();

/**
 * Generic Section Progress Schema
 *
 * Tracks progress for a single section type during onboarding.
 * sectionTypeKey references the SectionType.
 */
const SectionProgressSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(PartialSectionItemSchema).optional(),
  noData: z.boolean().optional(),
});

/**
 * Onboarding Progress Schema
 * Used for saving partial progress during onboarding.
 *
 * ARCHITECTURE: Uses generic sections format. Section progress is data-driven
 * through sectionTypeKey and dynamic section steps.
 */
export const OnboardingProgressSchema = z.object({
  currentStep: OnboardingStepSchema,
  completedSteps: z.array(OnboardingStepSchema),
  username: UsernameSchema.optional(),
  personalInfo: PartialPersonalInfoSchema.optional(),
  professionalProfile: PartialProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: PartialTemplateSelectionSchema.optional(),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

/**
 * Onboarding Status Schema
 * Response type for checking if user has completed onboarding
 */
export const OnboardingStatusSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: z.string().optional(),
});

export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

/**
 * Onboarding Result Schema
 * Response from completing the onboarding process
 */
export const OnboardingResultSchema = z.object({
  success: z.boolean(),
  resumeId: z.string(),
  message: z.string(),
});

export type OnboardingResult = z.infer<typeof OnboardingResultSchema>;

/**
 * Save Progress Result Schema
 * Response from saving partial onboarding progress
 */
export const SaveProgressResultSchema = z.object({
  success: z.boolean(),
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
});

export type SaveProgressResult = z.infer<typeof SaveProgressResultSchema>;

/**
 * Submit Onboarding DTO Schema
 * Complete data required to submit onboarding
 *
 * ARCHITECTURE: Uses generic sections format.
 * Each section is identified by sectionTypeKey.
 * Field-level validation happens server-side using SectionDefinitionZodFactory.
 */
export const SubmitOnboardingDtoSchema = z.object({
  username: UsernameSchema,
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  sections: z.array(
    z.object({
      sectionTypeKey: z.string().min(1),
      items: z.array(OnboardingSectionItemSchema),
      noData: z.boolean().default(false),
    }),
  ),
  templateSelection: TemplateSelectionSchema,
});

export type SubmitOnboardingDto = z.infer<typeof SubmitOnboardingDtoSchema>;

/**
 * API Response Schemas
 * Standard wrappers for onboarding endpoints
 */
export const OnboardingStatusResponseSchema = z.object({
  data: OnboardingStatusSchema,
});

export type OnboardingStatusResponseEnvelope = z.infer<typeof OnboardingStatusResponseSchema>;

export const OnboardingProgressResponseSchema = z.object({
  data: OnboardingProgressSchema,
});

export type OnboardingProgressResponseEnvelope = z.infer<typeof OnboardingProgressResponseSchema>;

export const OnboardingCompleteResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
    resumeId: z.string().uuid().optional(),
    message: z.string().optional(),
  }),
});

export type OnboardingCompleteResponseEnvelope = z.infer<typeof OnboardingCompleteResponseSchema>;
