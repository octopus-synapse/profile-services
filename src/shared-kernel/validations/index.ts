/**
 * Validation Schemas
 *
 * Domain-specific validation schemas for forms and API payloads.
 */

export * from './env.schema';
// From onboarding-data.schema - only export unique items (avoid conflicts with schemas/)
export {
  type OnboardingData,
  OnboardingDataSchema,
  PersonalInfoSchema,
  type TemplateSelection,
  TemplateSelectionSchema,
} from './onboarding-data.schema';

// From professional-profile.schema - only export unique items (avoid JobTitleSchema conflict)
export {
  type GitHubUrl,
  GitHubUrlSchema,
  type LinkedInUrl,
  LinkedInUrlSchema,
  type SocialUrl,
  SocialUrlSchema,
  type Summary,
  SummarySchema,
} from './professional-profile.schema';
export * from './username.schema';
