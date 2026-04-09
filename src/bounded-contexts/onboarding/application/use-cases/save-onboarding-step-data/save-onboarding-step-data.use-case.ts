import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { OnboardingStepDataMapper } from '../shared/onboarding-step-data.mapper';

export class SaveOnboardingStepDataUseCase {
  private readonly stepDataMapper = new OnboardingStepDataMapper();

  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
  ) {}

  async execute(
    userId: string,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.getProgress(userId);
    const update: OnboardingProgressData = {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };

    this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);
    await this.saveProgress(userId, update);
    return this.getProgress(userId);
  }
}
