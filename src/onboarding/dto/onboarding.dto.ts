/**
 * Onboarding DTOs
 *
 * Re-exports types from @octopus-synapse/profile-contracts as single source of truth.
 * Validation is handled by ZodValidationPipe in the controller layer.
 *
 * Kent Beck: "Eliminate duplication. The same code in two places is a bug waiting to happen."
 */

// Re-export all types from profile-contracts as single source of truth
export type {
  OnboardingData,
  Experience,
  Education,
  Skill,
  Language,
  TemplateSelection,
} from '@octopus-synapse/profile-contracts';

// Re-export schemas for direct Zod usage
export {
  OnboardingDataSchema,
  ExperienceSchema,
  EducationSchema,
  SkillSchema,
  LanguageSchema,
  TemplateSelectionSchema,
} from '@octopus-synapse/profile-contracts';

// Re-export progress DTO (still needed for partial updates)
export { OnboardingProgressDto } from './onboarding-progress.dto';
