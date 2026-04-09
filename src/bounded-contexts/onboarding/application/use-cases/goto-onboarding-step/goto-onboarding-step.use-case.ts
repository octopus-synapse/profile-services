import { BadRequestException } from '@nestjs/common';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';

export class GotoOnboardingStepUseCase {
  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly sectionTypeDefinition: SectionTypeDefinitionPort,
  ) {}

  async execute(userId: string, stepId: string): Promise<OnboardingProgressData> {
    const progress = await this.getProgress(userId);
    const steps = await this.buildSteps();
    const targetIndex = getStepIndex(stepId, steps);

    if (targetIndex < 0) {
      throw new BadRequestException(`Unknown step: ${stepId}`);
    }

    const isAccessible =
      progress.completedSteps.includes(stepId) ||
      stepId === progress.currentStep ||
      targetIndex <= getStepIndex(progress.currentStep, steps);

    if (!isAccessible) {
      throw new BadRequestException(`Step ${stepId} is not accessible yet`);
    }

    await this.saveProgress(userId, {
      currentStep: stepId,
      completedSteps: progress.completedSteps,
    });
    return this.getProgress(userId);
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeDefinition.findAll();
    return buildOnboardingSteps(sectionTypes);
  }
}
