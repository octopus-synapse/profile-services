import type { LoggerPort } from '@/shared-kernel';
import {
  OnboardingGenericValidationException,
  OnboardingMissingRequiredDataException,
  OnboardingStepNotCompletedException,
  type OnboardingValidationError,
} from '../../../domain/exceptions/onboarding.exceptions';
import type { CompletionResult } from '../../../domain/ports/onboarding-completion.port';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { extractOnboardingDataFromProgress } from '../../mappers/onboarding-resume.mapper';
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
    // Shared with the live preview path — same mapping, so the rendered
    // preview and the persisted résumé never drift.
    const data = extractOnboardingDataFromProgress(progress);
    this.validateProgressCompleteness(data.username ?? undefined, data.personalInfo);
    return data;
  }

  private validateProgressCompleteness(
    username: string | undefined,
    personalInfo: Record<string, unknown> | undefined,
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

    // The professional-profile step is reached linearly (so it appears in
    // completedSteps), but its fields (headline, summary, links) are all
    // optional — nothing here gates completion.

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
}
