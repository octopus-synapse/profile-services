/**
 * Onboarding Completion Port
 *
 * Abstracts the transactional completion flow (resume upsert, sections, user update).
 * Infrastructure adapter wraps Prisma $transaction.
 */

import type { OnboardingData } from '../schemas/onboarding-data.schema';

export type CompletionResult = { resumeId: string };

export abstract class OnboardingCompletionPort {
  /**
   * Execute the full onboarding completion within a single transaction:
   * 1. Upsert resume
   * 2. Save sections
   * 3. Mark onboarding complete on user
   * 4. Delete progress
   */
  abstract executeCompletion(userId: string, data: OnboardingData): Promise<CompletionResult>;
}
