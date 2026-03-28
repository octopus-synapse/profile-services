import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { SectionTypeData } from './config/onboarding-steps.config';
import type { OnboardingProgress } from './schemas/onboarding-progress.schema';
import { OnboardingCompletionService } from './services/onboarding-completion.service';
import { OnboardingNavigationService } from './services/onboarding-navigation.service';
import type { OnboardingProgressData } from './services/onboarding-progress/ports/onboarding-progress.port';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { SectionTypeDefinitionQuery } from './services/section-type-definition.query';

/**
 * Onboarding facade — delegates to focused services.
 *
 * Responsibilities split into:
 * - OnboardingCompletionService: completion flow, validation, transaction
 * - OnboardingNavigationService: step commands (next/prev/goto/save)
 * - SectionTypeDefinitionQuery: section type definitions with locale
 * - OnboardingProgressService: progress CRUD
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completionService: OnboardingCompletionService,
    private readonly navigationService: OnboardingNavigationService,
    private readonly progressService: OnboardingProgressService,
    private readonly sectionTypeQuery: SectionTypeDefinitionQuery,
  ) {}

  async completeOnboarding(userId: string, data: unknown) {
    return this.completionService.completeOnboarding(userId, data);
  }

  async completeFromProgress(userId: string) {
    return this.completionService.completeFromProgress(userId);
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasCompletedOnboarding: true, onboardingCompletedAt: true },
    });

    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

    return {
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  async getSectionTypeDefinitions(locale = 'en'): Promise<SectionTypeData[]> {
    return this.sectionTypeQuery.execute(locale);
  }

  async executeNext(
    userId: string,
    stepData?: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    return this.navigationService.executeNext(userId, stepData);
  }

  async executePrevious(userId: string): Promise<OnboardingProgressData> {
    return this.navigationService.executePrevious(userId);
  }

  async executeGoto(userId: string, stepId: string): Promise<OnboardingProgressData> {
    return this.navigationService.executeGoto(userId, stepId);
  }

  async executeSave(
    userId: string,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    return this.navigationService.executeSave(userId, stepData);
  }

  async saveProgress(userId: string, data: OnboardingProgress) {
    return this.progressService.saveProgress(userId, data);
  }

  async getProgress(userId: string) {
    return this.progressService.getProgress(userId);
  }

  async deleteProgress(userId: string) {
    return this.progressService.deleteProgress(userId);
  }
}
