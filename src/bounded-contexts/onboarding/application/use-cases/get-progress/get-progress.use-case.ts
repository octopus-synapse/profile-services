import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

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

export class GetProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string): Promise<OnboardingProgressData> {
    const progress = await this.repository.findProgressByUserId(userId);

    if (!progress) {
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
}
