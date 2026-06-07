import type { LoggerPort } from '@/shared-kernel';
import { DomainException } from '@/shared-kernel/exceptions/domain.exceptions';
import { OnboardingInvalidLocationException } from '../../../domain/exceptions/onboarding.exceptions';
import { OnboardingSectionPersistenceFailedException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { OnboardingStepDataMapper } from '../shared/onboarding-step-data.mapper';

/** Confirms a location string is a real dataset entry (geo `locationExists`). */
export type LocationValidatorFn = (label: string) => Promise<boolean>;

export class SaveOnboardingStepDataUseCase {
  private readonly stepDataMapper = new OnboardingStepDataMapper();

  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly logger: LoggerPort,
    // Optional so existing wirings/tests that don't validate geo still work.
    private readonly validateLocation?: LocationValidatorFn,
  ) {}

  async execute(
    userId: string,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    await this.assertLocationFromDataset(stepData);

    const progress = await this.getProgress(userId);
    const update: OnboardingProgressData = {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };

    this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);

    try {
      await this.saveProgress(userId, update);
    } catch (error) {
      // Domain exceptions (e.g. validation, username conflicts) bubble up
      // unchanged so the controller can pick a precise HTTP code. Anything
      // else (Prisma connection, JSON serialisation, etc.) is wrapped so
      // the SDK still receives a stable `ONBOARDING_SECTION_PERSISTENCE_FAILED`
      // code with the failing section in the payload.
      if (error instanceof DomainException) throw error;
      const detail = error instanceof Error ? error.message : 'Unknown persistence error';
      throw new OnboardingSectionPersistenceFailedException(progress.currentStep, detail);
    }

    return this.getProgress(userId);
  }

  /**
   * Reject a free-text `location` that isn't in the geo dataset. Only runs
   * when a validator is wired and the payload carries a non-empty location —
   * the picker only emits dataset labels, so this guards direct API callers.
   */
  private async assertLocationFromDataset(stepData: Record<string, unknown>): Promise<void> {
    if (!this.validateLocation) return;
    const location = stepData.location;
    if (typeof location !== 'string' || location.trim().length === 0) return;
    if (!(await this.validateLocation(location))) {
      throw new OnboardingInvalidLocationException(location);
    }
  }
}
