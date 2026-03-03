/**
 * Onboarding Progress Service (Facade)
 *
 * Delegates to use cases following Clean Architecture.
 * Single Responsibility: Facade that delegates to specific use cases.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OnboardingProgress } from '@/shared-kernel';
import {
  ONBOARDING_PROGRESS_USE_CASES,
  type OnboardingProgressData,
  type OnboardingProgressUseCases,
  type SaveProgressResult,
} from './onboarding-progress/ports/onboarding-progress.port';

@Injectable()
export class OnboardingProgressService {
  constructor(
    @Inject(ONBOARDING_PROGRESS_USE_CASES)
    private readonly useCases: OnboardingProgressUseCases,
  ) {}

  /**
   * Save onboarding progress
   * @returns SaveProgressResult - Progress data (not envelope)
   */
  async saveProgress(userId: string, data: OnboardingProgress): Promise<SaveProgressResult> {
    return this.useCases.saveProgressUseCase.execute(userId, data);
  }

  /**
   * Get onboarding progress
   * @returns Progress data (not envelope)
   */
  async getProgress(userId: string): Promise<OnboardingProgressData> {
    return this.useCases.getProgressUseCase.execute(userId);
  }

  /**
   * Delete onboarding progress
   */
  async deleteProgress(userId: string): Promise<void> {
    return this.useCases.deleteProgressUseCase.execute(userId);
  }

  /**
   * Delete progress within a transaction (used by onboarding completion)
   * Note: This delegates directly to repository for transaction support
   */
  async deleteProgressWithTx(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.onboardingProgress.deleteMany({ where: { userId } });
  }
}
