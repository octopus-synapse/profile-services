import { UsernameSchema } from '@/bounded-contexts/identity/users/domain/schemas/username.schema';
import { ValidationException } from '@/shared-kernel/exceptions';
import {
  OnboardingInvalidSectionTypeException,
  OnboardingUsernameTakenException,
} from '../../../domain/exceptions/onboarding-extra.exceptions';
import type {
  OnboardingProgressData,
  SaveProgressResult,
} from '../../../domain/ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../../../domain/ports/onboarding-progress.port';

/**
 * Save Progress Use Case
 *
 * GENERIC SECTIONS: This use case persists canonical section progress data.
 *
 * Username is normalized through `UsernameSchema` before any uniqueness check
 * so a request with "Enzo Patti" (uppercase + space) is rejected up front
 * instead of slipping into the progress row and exploding later at completion.
 */
export class SaveProgressUseCase {
  constructor(private readonly repository: OnboardingProgressRepositoryPort) {}

  async execute(userId: string, data: OnboardingProgressData): Promise<SaveProgressResult> {
    // Validate flag + array combinations for all sections
    this.validateFlagArrayConsistency(data);

    // Normalize + validate username before any I/O. `undefined` skips the
    // gate (caller didn't touch the field). Empty string also skips —
    // legacy clients send "" to clear a draft value.
    const normalizedUsername = this.normalizeUsername(data.username);
    if (normalizedUsername !== undefined) {
      await this.validateUsernameUniqueness(normalizedUsername, userId);
    }

    const result = await this.repository.upsertProgress(userId, {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: normalizedUsername,
      personalInfo: data.personalInfo,
      professionalProfile: data.professionalProfile,
      sections: data.sections,
      resumeStyleId: data.resumeStyleId ?? null,
    });

    return result;
  }

  private normalizeUsername(raw: string | null | undefined): string | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (raw.trim() === '') return undefined;
    const parsed = UsernameSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid username';
      throw new ValidationException(message);
    }
    return parsed.data;
  }

  private async validateUsernameUniqueness(username: string, userId: string): Promise<void> {
    const existingUser = await this.repository.findUserByUsername(username);

    // Allow if same user
    if (existingUser?.id === userId) {
      return;
    }

    if (existingUser) {
      throw new OnboardingUsernameTakenException();
    }
  }

  /**
   * Validates that noData flag is consistent with items array.
   * If noData is true, items should be empty or undefined.
   */
  private validateFlagArrayConsistency(data: OnboardingProgressData): void {
    if (!data.sections) return;

    for (const section of data.sections) {
      if (section.noData && section.items && section.items.length > 0) {
        throw new OnboardingInvalidSectionTypeException(section.sectionTypeKey);
      }
    }
  }
}
