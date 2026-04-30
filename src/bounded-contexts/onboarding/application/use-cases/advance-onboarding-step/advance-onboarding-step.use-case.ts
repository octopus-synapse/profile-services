import type { LoggerPort } from '@/shared-kernel';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import { OnboardingAlreadyAtLastStepException } from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { OnboardingStepDataMapper } from '../shared/onboarding-step-data.mapper';

const CTX = 'AdvanceOnboardingStepUseCase';

export class AdvanceOnboardingStepUseCase {
  private readonly stepDataMapper = new OnboardingStepDataMapper();

  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly sectionTypeDefinition: SectionTypeDefinitionPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    stepData?: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.getProgress(userId);
    const steps = await this.buildSteps();
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

    if (!nextStep) {
      throw new OnboardingAlreadyAtLastStepException();
    }

    // Business rule: navigation through the onboarding is free — users can advance
    // even with required fields empty. Missing required data is surfaced via the
    // sidebar red-badge and blocks onboarding COMPLETION, not intermediate advance.
    const update = this.buildNextStepUpdate(progress, nextStep.id, stepData);

    await this.saveProgress(userId, update);
    return this.getProgress(userId);
  }

  private buildNextStepUpdate(
    progress: OnboardingProgressData,
    nextStepId: string,
    stepData?: Record<string, unknown>,
  ): OnboardingProgressData {
    const update: OnboardingProgressData = {
      currentStep: nextStepId,
      completedSteps: progress.completedSteps.includes(progress.currentStep)
        ? progress.completedSteps
        : [...progress.completedSteps, progress.currentStep],
    };

    if (stepData) {
      this.logger.debug(
        `executeNext: merging step data — step=${progress.currentStep} keys=${Object.keys(stepData).join(',')}`,
        CTX,
      );
      this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);
    }

    return update;
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeDefinition.findAll();
    return buildOnboardingSteps(sectionTypes);
  }
}
