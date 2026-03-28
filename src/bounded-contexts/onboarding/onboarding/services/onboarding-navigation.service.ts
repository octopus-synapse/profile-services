import { BadRequestException, Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { buildOnboardingSteps, getStepIndex } from '../config/onboarding-steps.config';
import { canProceedFromStep } from '../config/onboarding-validation';
import type { OnboardingProgressData } from './onboarding-progress/ports/onboarding-progress.port';
import { OnboardingProgressService } from './onboarding-progress.service';
import { OnboardingStepDataMapper } from './onboarding-step-data.mapper';
import { SectionTypeDefinitionQuery } from './section-type-definition.query';

@Injectable()
export class OnboardingNavigationService {
  private readonly stepDataMapper = new OnboardingStepDataMapper();

  constructor(
    private readonly progressService: OnboardingProgressService,
    private readonly sectionTypeQuery: SectionTypeDefinitionQuery,
    private readonly logger: AppLoggerService,
  ) {}

  async executeNext(
    userId: string,
    stepData?: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const steps = await this.buildSteps();
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

    if (!nextStep) {
      throw new BadRequestException('Already at the last step');
    }

    // Merge step data into progress for validation
    const update = this.buildNextStepUpdate(progress, nextStep.id, stepData);

    // Validate before advancing - check if current step requirements are met
    // Use merged data (update values take precedence over existing progress)
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

    await this.progressService.saveProgress(userId, update as never);
    return this.progressService.getProgress(userId);
  }

  async executePrevious(userId: string): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const steps = await this.buildSteps();
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;

    if (!prevStep) {
      throw new BadRequestException('Already at the first step');
    }

    await this.progressService.saveProgress(userId, {
      currentStep: prevStep.id,
      completedSteps: progress.completedSteps,
    } as never);
    return this.progressService.getProgress(userId);
  }

  async executeGoto(userId: string, stepId: string): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
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

    await this.progressService.saveProgress(userId, {
      currentStep: stepId,
      completedSteps: progress.completedSteps,
    } as never);
    return this.progressService.getProgress(userId);
  }

  async executeSave(
    userId: string,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const update: Record<string, unknown> = {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };

    this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);
    await this.progressService.saveProgress(userId, update as never);
    return this.progressService.getProgress(userId);
  }

  private buildNextStepUpdate(
    progress: OnboardingProgressData,
    nextStepId: string,
    stepData?: Record<string, unknown>,
  ): Record<string, unknown> {
    const update: Record<string, unknown> = {
      currentStep: nextStepId,
      completedSteps: progress.completedSteps.includes(progress.currentStep)
        ? progress.completedSteps
        : [...progress.completedSteps, progress.currentStep],
    };

    if (stepData) {
      this.logger.debug('executeNext: merging step data', 'OnboardingNavigationService', {
        currentStep: progress.currentStep,
        stepDataKeys: Object.keys(stepData),
      });
      this.stepDataMapper.mergeStepData(update, progress.currentStep, stepData, progress);
    }

    return update;
  }

  private async buildSteps() {
    const sectionTypes = await this.sectionTypeQuery.execute();
    return buildOnboardingSteps(sectionTypes);
  }
}
