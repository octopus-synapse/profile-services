/**
 * Validation Schemas
 *
 * Domain-specific validation schemas for forms and API payloads.
 */

export * from './env.schema';
export * from './username.schema';

// From professional-profile.schema - only export unique items (avoid JobTitleSchema conflict)
export {
  SummarySchema,
  type Summary,
  SocialUrlSchema,
  type SocialUrl,
  LinkedInUrlSchema,
  type LinkedInUrl,
  GitHubUrlSchema,
  type GitHubUrl,
} from './professional-profile.schema';

// From onboarding-data.schema - only export unique items (avoid conflicts with schemas/)
export {
  PersonalInfoSchema,
  TemplateSelectionSchema,
  type TemplateSelection,
  OnboardingDataSchema,
  type OnboardingData,
} from './onboarding-data.schema';
