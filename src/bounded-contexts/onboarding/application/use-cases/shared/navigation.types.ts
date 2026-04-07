/**
 * Shared types for navigation use cases.
 *
 * These function types abstract the progress persistence so navigation
 * use cases remain decoupled from the progress repository.
 */

import type {
  OnboardingProgressData,
  SaveProgressResult,
} from '../../../domain/ports/onboarding-progress.port';

export type SaveProgressFn = (userId: string, data: OnboardingProgressData) => Promise<SaveProgressResult>;
export type GetProgressFn = (userId: string) => Promise<OnboardingProgressData>;
