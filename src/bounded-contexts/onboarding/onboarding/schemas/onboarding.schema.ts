/**
 * Onboarding Schema
 *
 * Uses @/shared-kernel for domain validation.
 * Imports complete onboarding payload schema from contracts.
 */

import { type OnboardingData, OnboardingDataSchema } from '@/shared-kernel';

// Re-export from contracts as single source of truth
// Type annotation prevents TypeScript from inferring Zod types
export const onboardingDataSchema: typeof OnboardingDataSchema = OnboardingDataSchema;
export type { OnboardingData };
