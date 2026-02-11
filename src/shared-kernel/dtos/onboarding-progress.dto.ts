/**
 * Onboarding Progress DTOs
 *
 * Data Transfer Objects for onboarding progress tracking.
 * Allows partial saves during the onboarding flow.
 */

import { z } from 'zod';
import {
  EducationSchema,
  ExperienceSchema,
  LanguageSchema,
  PersonalInfoSchema,
  SkillSchema,
  TemplateSelectionSchema,
} from '../validations/onboarding-data.schema';
import { ProfessionalProfileSchema } from '../validations/professional-profile.schema';
import { UsernameSchema } from '../validations/username.schema';

/**
 * Onboarding Step Enum
 */
export const OnboardingStepSchema = z.enum([
  'welcome',
  'personal-info',
  'username',
  'professional-profile',
  'experience',
  'education',
  'skills',
  'languages',
  'template',
  'review',
  'complete',
]);

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

/**
 * Partial schemas for progress saving
 * These are more lenient than the final schemas to allow incomplete data
 */
const PartialPersonalInfoSchema = PersonalInfoSchema.partial();
const PartialProfessionalProfileSchema = ProfessionalProfileSchema.partial();
const PartialExperienceSchema = ExperienceSchema.partial();
const PartialEducationSchema = EducationSchema.partial();
const PartialSkillSchema = SkillSchema.partial();
const PartialLanguageSchema = LanguageSchema.partial();
const PartialTemplateSelectionSchema = TemplateSelectionSchema.partial();

/**
 * Onboarding Progress Schema
 * Used for saving partial progress during onboarding.
 */
export const OnboardingProgressSchema = z.object({
  currentStep: OnboardingStepSchema,
  completedSteps: z.array(OnboardingStepSchema),
  username: UsernameSchema.optional(),
  personalInfo: PartialPersonalInfoSchema.optional(),
  professionalProfile: PartialProfessionalProfileSchema.optional(),
  experiences: z.array(PartialExperienceSchema).optional(),
  noExperience: z.boolean().optional(),
  education: z.array(PartialEducationSchema).optional(),
  noEducation: z.boolean().optional(),
  skills: z.array(PartialSkillSchema).optional(),
  noSkills: z.boolean().optional(),
  languages: z.array(PartialLanguageSchema).optional(),
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
 */
export const SubmitOnboardingDtoSchema = z.object({
  username: UsernameSchema,
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  skillsStep: z.object({
    skills: z.array(SkillSchema),
    noSkills: z.boolean(),
  }),
  experiencesStep: z
    .object({
      experiences: z.array(ExperienceSchema),
      noExperience: z.boolean(),
    })
    .optional(),
  educationStep: z
    .object({
      education: z.array(EducationSchema),
      noEducation: z.boolean(),
    })
    .optional(),
  languages: z.array(LanguageSchema).optional(),
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
