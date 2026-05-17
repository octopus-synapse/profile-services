import type { LoggerPort } from '@/shared-kernel';
import {
  OnboardingGenericValidationException,
  OnboardingMissingRequiredDataException,
  OnboardingStepNotCompletedException,
  type OnboardingValidationError,
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
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Onboarding steps whose completion is mandatory before the user can
   * trigger the final completion from saved progress. Mirrors the
   * `requiredSteps` config in `onboarding-steps.config.ts`. Kept inline
   * (rather than imported) to avoid coupling the use-case to the steps
   * registry — these three are stable foundational steps.
   */
  private static readonly REQUIRED_PROGRESS_STEPS = [
    'personal-info',
    'username',
    'professional-profile',
  ];

  async execute(userId: string): Promise<CompletionResult> {
    const progress = await this.getProgress(userId);
    this.assertRequiredStepsCompleted(progress);
    const onboardingData = this.buildOnboardingDataFromProgress(progress);
    return this.completeOnboarding.execute(userId, onboardingData);
  }

  private assertRequiredStepsCompleted(progress: OnboardingProgressData): void {
    const completed = new Set(progress.completedSteps);
    for (const step of CompleteOnboardingFromProgressUseCase.REQUIRED_PROGRESS_STEPS) {
      if (!completed.has(step)) {
        throw new OnboardingStepNotCompletedException(step);
      }
    }
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
      if (missingFields.length > 0) {
        throw new OnboardingMissingRequiredDataException(missingFields);
      }
      throw new OnboardingGenericValidationException(
        `Validation failed: ${errors.map((e) => e.message).join('; ')}`,
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
