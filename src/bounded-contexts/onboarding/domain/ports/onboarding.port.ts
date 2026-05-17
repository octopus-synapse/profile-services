/**
 * Onboarding Port
 *
 * Defines domain types and repository abstraction for onboarding operations.
 */

import type { SectionTypeData } from '../config/onboarding-steps.config';
import type { OnboardingData } from '../schemas/onboarding-data.schema';
import type { OnboardingStepConfig } from './onboarding-config.port';
import type { OnboardingProgressData } from './onboarding-progress.port';

// Generic transaction client type (implementation provided by repository)
export type TransactionClient = unknown;

// ============================================================================
// Domain Types
// ============================================================================

export type OnboardingCompletionResult = { resumeId: string };

export type OnboardingStatus = {
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
};

export type UserForOnboarding = { id: string; hasCompletedOnboarding: boolean };

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

export abstract class OnboardingUseCases {
  abstract readonly completeOnboardingUseCase: {
    execute: (userId: string, data: unknown) => Promise<OnboardingCompletionResult>;
  };
  abstract readonly completeOnboardingFromProgressUseCase: {
    execute: (userId: string) => Promise<OnboardingCompletionResult>;
  };
  abstract readonly getOnboardingStatusUseCase: {
    execute: (userId: string) => Promise<OnboardingStatus>;
  };
  abstract readonly advanceOnboardingStepUseCase: {
    execute: (
      userId: string,
      stepData?: Record<string, unknown>,
    ) => Promise<OnboardingProgressData>;
  };
  abstract readonly goBackOnboardingStepUseCase: {
    execute: (userId: string) => Promise<OnboardingProgressData>;
  };
  abstract readonly gotoOnboardingStepUseCase: {
    execute: (userId: string, stepId: string) => Promise<OnboardingProgressData>;
  };
  abstract readonly saveOnboardingStepDataUseCase: {
    execute: (userId: string, stepData: Record<string, unknown>) => Promise<OnboardingProgressData>;
  };
  abstract readonly getSectionTypeDefinitionsUseCase: {
    execute: (locale?: string) => Promise<SectionTypeData[]>;
  };
  abstract readonly restartOnboardingUseCase: {
    execute: (
      userId: string,
      steps: OnboardingStepConfig[],
      options?: { clean?: boolean },
    ) => Promise<{ success: boolean }>;
  };
}
