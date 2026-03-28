/**
 * Onboarding Port
 *
 * Defines domain types and repository abstraction for onboarding operations.
 */

import type { OnboardingData } from '@/bounded-contexts/onboarding/onboarding/domain/schemas/onboarding-data.schema';

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
  getOnboardingStatusUseCase: {
    execute: (userId: string) => Promise<OnboardingStatus>;
  };
}
