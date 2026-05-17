/**
 * Onboarding Progress Port
 *
 * Defines domain types and repository abstraction for onboarding progress.
 *
 * ARCHITECTURE: Uses GENERIC SECTIONS model.
 * Progress is represented through a sections array keyed by SectionType.
 */

// Generic transaction client type (implementation provided by repository)
export type TransactionClient = unknown;

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Section progress data for a single section type.
 */
export type SectionProgressData = { sectionTypeKey: string; items?: unknown[]; noData?: boolean };

export type OnboardingProgressData = {
  currentStep: string;
  completedSteps: string[];
  username?: string | null;
  personalInfo?: unknown;
  professionalProfile?: unknown;
  sections?: SectionProgressData[];
  templateSelection?: unknown;
  // Section-step keys the user opted into via the "what else?" gate.
  // The presenter filters optional extras off this list.
  activatedExtras?: string[];
};

export type SaveProgressResult = { currentStep: string; completedSteps: string[] };

export type ProgressRecord = {
  userId: string;
  currentStep: string;
  completedSteps: string[];
  username: string | null;
  personalInfo: unknown;
  professionalProfile: unknown;
  sections: SectionProgressData[] | null;
  templateSelection: unknown;
  activatedExtras: string[];
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

  /**
   * Tx-aware upsert — same shape as `upsertProgress` but writes through
   * a caller-supplied transaction client so the operation joins the
   * outer atomic boundary (e.g. restart-onboarding bundles delete +
   * upsert + user.update under one transaction so a crash never leaves
   * the user with `onboardingCompletedAt = null` and no progress row).
   */
  abstract upsertProgressWithTx(
    tx: TransactionClient,
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }>;

  abstract setActivatedExtras(userId: string, extras: string[]): Promise<void>;

  abstract deleteProgress(userId: string): Promise<void>;

  abstract deleteProgressWithTx(tx: TransactionClient, userId: string): Promise<void>;

  abstract findUserByUsername(username: string): Promise<{ id: string } | null>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class OnboardingProgressUseCases {
  abstract readonly saveProgressUseCase: {
    execute: (userId: string, data: OnboardingProgressData) => Promise<SaveProgressResult>;
  };
  abstract readonly getProgressUseCase: {
    execute: (userId: string) => Promise<OnboardingProgressData>;
  };
  abstract readonly deleteProgressUseCase: { execute: (userId: string) => Promise<void> };
}
