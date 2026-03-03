import type {
  OnboardingProgressData,
  OnboardingProgressRepositoryPort,
} from '../ports/onboarding-progress.port';

/** Onboarding progress expires after 36 hours */
const PROGRESS_EXPIRATION_HOURS = 36;

export const INITIAL_PROGRESS: OnboardingProgressData = {
  currentStep: 'welcome',
  completedSteps: [],
  username: null,
  personalInfo: null,
  professionalProfile: null,
  experiences: [],
  noExperience: false,
  education: [],
  noEducation: false,
  skills: [],
  noSkills: false,
  languages: [],
  templateSelection: null,
};

export class GetProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string): Promise<OnboardingProgressData> {
    const progress = await this.repository.findProgressByUserId(userId);

    if (!progress) {
      return INITIAL_PROGRESS;
    }

    // Check for expiration (36 hours)
    if (this.isProgressExpired(progress.updatedAt)) {
      await this.repository.deleteProgress(userId);
      return INITIAL_PROGRESS;
    }

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: progress.username,
      personalInfo: progress.personalInfo,
      professionalProfile: progress.professionalProfile,
      experiences: progress.experiences ?? [],
      noExperience: progress.noExperience,
      education: progress.education ?? [],
      noEducation: progress.noEducation,
      skills: progress.skills ?? [],
      noSkills: progress.noSkills,
      languages: progress.languages ?? [],
      templateSelection: progress.templateSelection,
    };
  }

  private isProgressExpired(updatedAt: Date): boolean {
    const hoursElapsed = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed >= PROGRESS_EXPIRATION_HOURS;
  }
}
