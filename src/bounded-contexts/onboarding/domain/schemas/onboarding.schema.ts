/**
 * Onboarding Schema
 *
 * Uses @/shared-kernel for domain validation.
 * Imports complete onboarding payload schema from contracts.
 */

import { z } from 'zod';
import { type OnboardingData, OnboardingDataSchema } from './onboarding-data.schema';

// Re-export from contracts as single source of truth
// Type annotation prevents TypeScript from inferring Zod types
export const onboardingDataSchema: typeof OnboardingDataSchema = OnboardingDataSchema;
export type { OnboardingData };

export type onboardingDataDto = z.infer<typeof onboardingDataSchema>;
