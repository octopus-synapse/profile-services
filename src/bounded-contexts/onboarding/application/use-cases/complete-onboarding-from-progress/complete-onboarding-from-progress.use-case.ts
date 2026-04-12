import {
  type OnboardingValidationError,
  OnboardingValidationException,
} from '../../../domain/exceptions/onboarding.exceptions';
import type { CompletionResult } from '../../../domain/ports/onboarding-completion.port';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { GetProgressFn } from '../shared/navigation.types';

export interface CompleteOnboardingExecutor {
  execute: (userId: string, data: unknown) => Promise<CompletionResult>;
}

export class CompleteOnboardingFromProgressUseCase {
  constructor(
    private readonly getProgress: GetProgressFn,
    private readonly completeOnboarding: CompleteOnboardingExecutor,
  ) {}

  async execute(userId: string): Promise<CompletionResult> {
    const progress = await this.getProgress(userId);
    const onboardingData = this.buildOnboardingDataFromProgress(progress);
    return this.completeOnboarding.execute(userId, onboardingData);
  }

  private buildOnboardingDataFromProgress(progress: OnboardingProgressData) {
    const personalInfo = progress.personalInfo as Record<string, unknown> | undefined;
    const professionalProfile = progress.professionalProfile as Record<string, unknown> | undefined;
    const templateSelection = progress.templateSelection as Record<string, unknown> | undefined;

    this.validateProgressCompleteness(
      progress.username ?? undefined,
      personalInfo,
      professionalProfile,
    );

    return {
      username: progress.username,
      personalInfo,
      professionalProfile,
      templateSelection: templateSelection ?? {},
      sections: this.mapProgressSections(progress),
    };
  }

  private validateProgressCompleteness(
    username: string | undefined,
    personalInfo: Record<string, unknown> | undefined,
    professionalProfile: Record<string, unknown> | undefined,
  ): void {
    const errors: OnboardingValidationError[] = [];

    if (!username) {
      errors.push({ code: 'REQUIRED', field: 'username', message: 'Username is required' });
    }

    if (!personalInfo) {
      errors.push({
        code: 'REQUIRED',
        field: 'personalInfo',
        message: 'Personal information is required',
      });
    } else {
      this.validatePersonalInfo(personalInfo, errors);
    }

    if (!professionalProfile) {
      errors.push({
        code: 'REQUIRED',
        field: 'professionalProfile',
        message: 'Professional profile is required',
      });
    } else {
      this.validateProfessionalProfile(professionalProfile, errors);
    }

    if (errors.length > 0) {
      const missingFields = errors.filter((e) => e.code === 'REQUIRED').map((e) => e.field);
      throw new OnboardingValidationException(
        missingFields.length > 0 ? 'ONBOARDING_INCOMPLETE' : 'VALIDATION_ERROR',
        missingFields.length > 0
          ? `Missing required data: ${missingFields.join(', ')}`
          : `Validation failed: ${errors.map((e) => e.message).join('; ')}`,
        errors,
      );
    }
  }

  private validatePersonalInfo(data: Record<string, unknown>, errors: OnboardingValidationError[]) {
    if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length === 0) {
      errors.push({
        code: 'REQUIRED',
        field: 'personalInfo.fullName',
        message: 'Full name is required',
      });
    }
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push({
        code: 'INVALID_EMAIL',
        field: 'personalInfo.email',
        message: 'Valid email is required',
      });
    }
  }

  private validateProfessionalProfile(
    data: Record<string, unknown>,
    errors: OnboardingValidationError[],
  ) {
    if (!data.jobTitle || typeof data.jobTitle !== 'string' || data.jobTitle.trim().length === 0) {
      errors.push({
        code: 'REQUIRED',
        field: 'professionalProfile.jobTitle',
        message: 'Job title is required',
      });
    }
  }

  private mapProgressSections(progress: OnboardingProgressData) {
    return (progress.sections ?? []).map((s) => ({
      sectionTypeKey: s.sectionTypeKey,
      items: (s.items ?? []).map((item) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return { content: (obj.content as Record<string, unknown>) ?? obj };
        }
        return { content: {} };
      }),
      noData: s.noData ?? false,
    }));
  }
}
