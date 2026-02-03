/**
 * Onboarding Schema
 *
 * Uses @octopus-synapse/profile-contracts for domain validation.
 * Imports complete onboarding payload schema from contracts.
 */

import {
  OnboardingDataSchema,
  type OnboardingData,
} from '@octopus-synapse/profile-contracts';

// Re-export from contracts as single source of truth
// Type annotation prevents TypeScript from inferring Zod types
export const onboardingDataSchema: typeof OnboardingDataSchema =
  OnboardingDataSchema;
export type { OnboardingData };
