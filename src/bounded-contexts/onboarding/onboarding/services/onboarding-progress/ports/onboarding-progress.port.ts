/**
 * Onboarding Progress Port
 *
 * Defines domain types and repository abstraction for onboarding progress.
 *
 * ARCHITECTURE: Uses GENERIC SECTIONS model.
 * Progress is represented through a sections array keyed by SectionType.
 */

import type { OnboardingProgress } from '../../../schemas/onboarding-progress.schema';

// Generic transaction client type (implementation provided by repository)
export type TransactionClient = unknown;

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Section progress data for a single section type.
 */
export type SectionProgressData = {
  sectionTypeKey: string;
  items?: unknown[];
  noData?: boolean;
};

export type OnboardingProgressData = {
  currentStep: string;
  completedSteps: string[];
  username?: string | null;
  personalInfo?: unknown;
  professionalProfile?: unknown;
  sections?: SectionProgressData[];
  templateSelection?: unknown;
};

export type SaveProgressResult = {
  currentStep: string;
  completedSteps: string[];
};

export type ProgressRecord = {
  userId: string;
  currentStep: string;
  completedSteps: string[];
  username: string | null;
  personalInfo: unknown;
  professionalProfile: unknown;
  sections: SectionProgressData[] | null;
  templateSelection: unknown;
  updatedAt: Date;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class OnboardingProgressRepositoryPort {
  abstract findProgressByUserId(userId: string): Promise<ProgressRecord | null>;

  abstract upsertProgress(
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }>;

  abstract deleteProgress(userId: string): Promise<void>;

  abstract deleteProgressWithTx(tx: TransactionClient, userId: string): Promise<void>;

  abstract findUserByUsername(username: string): Promise<{ id: string } | null>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const ONBOARDING_PROGRESS_USE_CASES = Symbol('ONBOARDING_PROGRESS_USE_CASES');

export interface OnboardingProgressUseCases {
  saveProgressUseCase: {
    execute: (userId: string, data: OnboardingProgress) => Promise<SaveProgressResult>;
  };
  getProgressUseCase: {
    execute: (userId: string) => Promise<OnboardingProgressData>;
  };
  deleteProgressUseCase: {
    execute: (userId: string) => Promise<void>;
  };
}
