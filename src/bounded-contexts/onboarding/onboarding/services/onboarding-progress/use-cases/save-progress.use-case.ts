import type { OnboardingProgress } from '@/shared-kernel';
import { ConflictException, ERROR_MESSAGES, ValidationException } from '@/shared-kernel';
import type {
  OnboardingProgressRepositoryPort,
  SaveProgressResult,
} from '../ports/onboarding-progress.port';

/**
 * Save Progress Use Case
 *
 * GENERIC SECTIONS: This use case persists canonical section progress data.
 */
export class SaveProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string, data: OnboardingProgress): Promise<SaveProgressResult> {
    // Validate flag + array combinations for all sections
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
      sections: data.sections,
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

  /**
   * Validates that noData flag is consistent with items array.
   * If noData is true, items should be empty or undefined.
   */
  private validateFlagArrayConsistency(data: OnboardingProgress): void {
    if (!data.sections) return;

    for (const section of data.sections) {
      if (section.noData && section.items && section.items.length > 0) {
        throw new ValidationException(
          `Cannot have items for section "${section.sectionTypeKey}" when noData is true. ` +
            'Either set noData to false or provide an empty items array.',
        );
      }
    }
  }
}
