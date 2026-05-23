import { OnboardingSessionExpiredException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

/** Onboarding progress expires after 36 hours */
const PROGRESS_EXPIRATION_HOURS = 36;

/**
 * Initial progress state using GENERIC SECTIONS model.
 * No hard-coded section types - sections array is empty initially.
 */
export const INITIAL_PROGRESS: OnboardingProgressData = {
  currentStep: 'welcome',
  completedSteps: [],
  username: null,
  personalInfo: null,
  professionalProfile: null,
  sections: [],
  resumeStyleId: null,
  activatedExtras: [],
};

export interface GetProgressOptions {
  /**
   * When `true`, expired progress raises `OnboardingSessionExpiredException`
   * instead of being silently reset to the INITIAL state. The completion
   * orchestrator opts-in so the SDK can show a "your session timed out"
   * banner instead of dropping the user back to the welcome step without
   * explanation.
   */
  strict?: boolean;
}

export class GetProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string, opts: GetProgressOptions = {}): Promise<OnboardingProgressData> {
    const progress = await this.repository.findProgressByUserId(userId);

    if (!progress) {
      return INITIAL_PROGRESS;
    }

    // Check for expiration (36 hours)
    if (this.isProgressExpired(progress.updatedAt)) {
      if (opts.strict) {
        throw new OnboardingSessionExpiredException();
      }
      await this.repository.deleteProgress(userId);
      return INITIAL_PROGRESS;
    }

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: progress.username,
      personalInfo: progress.personalInfo,
      professionalProfile: progress.professionalProfile,
      sections: progress.sections ?? [],
      resumeStyleId: progress.resumeStyleId,
      activatedExtras: progress.activatedExtras,
    };
  }

  private isProgressExpired(updatedAt: Date): boolean {
    const hoursElapsed = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed >= PROGRESS_EXPIRATION_HOURS;
  }
}
