import { BadRequestException } from '@nestjs/common';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import { canProceedFromStep } from '../../../domain/config/onboarding-validation';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';
import { OnboardingStepDataMapper } from '../shared/onboarding-step-data.mapper';

export class AdvanceOnboardingStepUseCase {
  private readonly stepDataMapper = new OnboardingStepDataMapper();

  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly sectionTypeDefinition: SectionTypeDefinitionPort,
    private readonly logger?: {
      debug: (msg: string, ctx: string, meta?: Record<string, unknown>) => void;
    },
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
      throw new BadRequestException('Already at the last step');
    }

    // Merge step data into progress for validation
    const update = this.buildNextStepUpdate(progress, nextStep.id, stepData);

    // Validate before advancing - check if current step requirements are met
    if (
      !canProceedFromStep(progress.currentStep, {
        username: (update.username ?? progress.username) as string | undefined,
        personalInfo: (update.personalInfo ?? progress.personalInfo) as
          | { fullName?: string; email?: string }
          | undefined,
        professionalProfile: (update.professionalProfile ?? progress.professionalProfile) as
          | { jobTitle?: string }
          | undefined,
        templateSelection: (update.templateSelection ?? progress.templateSelection) as
          | { colorScheme?: string }
          | undefined,
      })
    ) {
      throw new BadRequestException(
        `Cannot proceed from ${progress.currentStep}: required fields missing`,
      );
    }

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
      this.logger?.debug('executeNext: merging step data', 'AdvanceOnboardingStepUseCase', {
        currentStep: progress.currentStep,
        stepDataKeys: Object.keys(stepData),
      });
      this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);
    }

    return update;
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeDefinition.findAll();
    return buildOnboardingSteps(sectionTypes);
  }
}
