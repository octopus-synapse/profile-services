import type { LoggerPort } from '@/shared-kernel';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import {
  OnboardingAlreadyAtLastStepException,
  OnboardingUnknownStepException,
} from '../../../domain/exceptions/onboarding-extra.exceptions';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';
import type { GetProgressFn, SaveProgressFn } from '../shared/navigation.types';

export class GotoOnboardingStepUseCase {
  constructor(
    private readonly saveProgress: SaveProgressFn,
    private readonly getProgress: GetProgressFn,
    private readonly sectionTypeDefinition: SectionTypeDefinitionPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, stepId: string): Promise<OnboardingProgressData> {
    const progress = await this.getProgress(userId);
    const steps = await this.buildSteps();
    const targetIndex = getStepIndex(stepId, steps);

    if (targetIndex < 0) {
      throw new OnboardingUnknownStepException(stepId);
    }

    // P1 #26 — state-machine guard: forward jumps are restricted to
    // `currentIndex + 1` (one step at a time), so a user can't skip past
    // unvisited steps. Backward navigation to any earlier step stays
    // free, and re-selecting the current step is a no-op.
    const currentIndex = getStepIndex(progress.currentStep, steps);
    if (currentIndex >= 0 && targetIndex > currentIndex + 1) {
      throw new OnboardingAlreadyAtLastStepException();
    }

    await this.saveProgress(userId, {
      currentStep: stepId,
      completedSteps: progress.completedSteps,
    });
    return this.getProgress(userId);
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeDefinition.listAll();
    return buildOnboardingSteps(sectionTypes);
  }
}
