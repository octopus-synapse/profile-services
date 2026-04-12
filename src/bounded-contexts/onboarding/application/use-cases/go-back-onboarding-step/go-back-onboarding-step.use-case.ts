import { BadRequestException } from '@nestjs/common';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import type { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';

export class GoBackOnboardingStepUseCase {
  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly sectionTypeDefinition: SectionTypeDefinitionPort,
  ) {}

  async execute(userId: string): Promise<OnboardingProgressData> {
    const progress = await this.getProgress(userId);
    const steps = await this.buildSteps();
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;

    if (!prevStep) {
      throw new BadRequestException('Already at the first step');
    }

    await this.saveProgress(userId, {
      currentStep: prevStep.id,
      completedSteps: progress.completedSteps,
    });
    return this.getProgress(userId);
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeDefinition.findAll();
    return buildOnboardingSteps(sectionTypes);
  }
}
