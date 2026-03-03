import type { OnboardingProgress } from '@/shared-kernel';
import { ConflictException, ERROR_MESSAGES, ValidationException } from '@/shared-kernel';
import type {
  OnboardingProgressRepositoryPort,
  SaveProgressResult,
} from '../ports/onboarding-progress.port';

export class SaveProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string, data: OnboardingProgress): Promise<SaveProgressResult> {
    // Validate flag + array combinations
    this.validateFlagArrayConsistency(data);

    // Validate username uniqueness if provided
    if (data.username) {
      await this.validateUsernameUniqueness(data.username, userId);
    }

    const result = await this.repository.upsertProgress(userId, {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username,
      personalInfo: data.personalInfo,
      professionalProfile: data.professionalProfile,
      experiences: data.experiences,
      noExperience: data.noExperience ?? false,
      education: data.education,
      noEducation: data.noEducation ?? false,
      skills: data.skills,
      noSkills: data.noSkills ?? false,
      languages: data.languages,
      templateSelection: data.templateSelection,
    });

    return result;
  }

  private async validateUsernameUniqueness(username: string, userId: string): Promise<void> {
    const existingUser = await this.repository.findUserByUsername(username);

    // Allow if same user
    if (existingUser?.id === userId) {
      return;
    }

    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
    }
  }

  private validateFlagArrayConsistency(data: OnboardingProgress): void {
    if (data.noExperience && data.experiences && data.experiences.length > 0) {
      throw new ValidationException(
        'Cannot have experiences when noExperience is true. Either set noExperience to false or provide an empty experiences array.',
      );
    }

    if (data.noEducation && data.education && data.education.length > 0) {
      throw new ValidationException(
        'Cannot have education entries when noEducation is true. Either set noEducation to false or provide an empty education array.',
      );
    }

    if (data.noSkills && data.skills && data.skills.length > 0) {
      throw new ValidationException(
        'Cannot have skills when noSkills is true. Either set noSkills to false or provide an empty skills array.',
      );
    }
  }
}
