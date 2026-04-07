/**
 * Onboarding Port
 *
 * Defines domain types and repository abstraction for onboarding operations.
 */

import type { OnboardingData } from '../schemas/onboarding-data.schema';
import type { SectionTypeData } from '../config/onboarding-steps.config';
import type { OnboardingProgressData } from './onboarding-progress.port';

// Generic transaction client type (implementation provided by repository)
export type TransactionClient = unknown;

// ============================================================================
// Domain Types
// ============================================================================

export type OnboardingCompletionResult = {
  resumeId: string;
};

export type OnboardingStatus = {
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
};

export type UserForOnboarding = {
  id: string;
  hasCompletedOnboarding: boolean;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class OnboardingRepositoryPort {
  abstract findUserById(userId: string): Promise<UserForOnboarding | null>;

  abstract getOnboardingStatus(userId: string): Promise<OnboardingStatus | null>;

  abstract markOnboardingComplete(
    tx: TransactionClient,
    userId: string,
    data: OnboardingData,
  ): Promise<void>;

  abstract executeInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const ONBOARDING_USE_CASES = Symbol('ONBOARDING_USE_CASES');

export interface OnboardingUseCases {
  completeOnboardingUseCase: {
    execute: (userId: string, data: unknown) => Promise<OnboardingCompletionResult>;
  };
  completeOnboardingFromProgressUseCase: {
    execute: (userId: string) => Promise<OnboardingCompletionResult>;
  };
  getOnboardingStatusUseCase: {
    execute: (userId: string) => Promise<OnboardingStatus>;
  };
  advanceOnboardingStepUseCase: {
    execute: (userId: string, stepData?: Record<string, unknown>) => Promise<OnboardingProgressData>;
  };
  goBackOnboardingStepUseCase: {
    execute: (userId: string) => Promise<OnboardingProgressData>;
  };
  gotoOnboardingStepUseCase: {
    execute: (userId: string, stepId: string) => Promise<OnboardingProgressData>;
  };
  saveOnboardingStepDataUseCase: {
    execute: (userId: string, stepData: Record<string, unknown>) => Promise<OnboardingProgressData>;
  };
  getSectionTypeDefinitionsUseCase: {
    execute: (locale?: string) => Promise<SectionTypeData[]>;
  };
}
