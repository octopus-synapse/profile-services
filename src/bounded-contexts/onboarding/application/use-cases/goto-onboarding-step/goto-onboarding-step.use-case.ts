import type { LoggerPort } from '@/shared-kernel';
import { buildOnboardingSteps, getStepIndex } from '../../../domain/config/onboarding-steps.config';
import { OnboardingUnknownStepException } from '../../../domain/exceptions/onboarding-extra.exceptions';
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

    // The frontend now owns step ordering (app-driven flow + review-hub),
    // so `goto` must reach any known step in either direction — the user
    // edits an earlier section from the review hub or resumes forward into
    // where they left off. The only jump we still refuse is one made from a
    // stale `currentStep` that no longer exists in the config, so the user
    // lands somewhere deterministic via restart rather than anywhere.
    const currentIndex = getStepIndex(progress.currentStep, steps);
    if (currentIndex < 0) {
      throw new OnboardingUnknownStepException(progress.currentStep);
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
