/**
 * Onboarding Progress Service
 * Single Responsibility: Manage onboarding progress (checkpoints)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { OnboardingProgressDto } from '../dto/onboarding.dto';

const INITIAL_PROGRESS = {
  currentStep: 'welcome',
  completedSteps: [],
  username: null,
  personalInfo: null,
  professionalProfile: null,
  experiences: [],
  noExperience: false,
  education: [],
  noEducation: false,
  skills: [],
  noSkills: false,
  languages: [],
  templateSelection: null,
};

@Injectable()
export class OnboardingProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async saveProgress(userId: string, data: OnboardingProgressDto) {
    this.logger.debug(
      'Saving onboarding progress',
      'OnboardingProgressService',
      {
        userId,
        currentStep: data.currentStep,
      },
    );

    const progressData = this.buildProgressData(data);

    const progress = await this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });

    return {
      success: true,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };
  }

  async getProgress(userId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return INITIAL_PROGRESS;
    }

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: progress.username,
      personalInfo: progress.personalInfo,
      professionalProfile: progress.professionalProfile,
      experiences: progress.experiences ?? [],
      noExperience: progress.noExperience,
      education: progress.education ?? [],
      noEducation: progress.noEducation,
      skills: progress.skills ?? [],
      noSkills: progress.noSkills,
      languages: progress.languages ?? [],
      templateSelection: progress.templateSelection,
    };
  }

  async deleteProgress(userId: string) {
    await this.prisma.onboardingProgress.deleteMany({ where: { userId } });
  }

  private buildProgressData(data: OnboardingProgressDto) {
    return {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? undefined,
      personalInfo: data.personalInfo ?? undefined,
      professionalProfile: data.professionalProfile ?? undefined,
      experiences: data.experiences ?? undefined,
      noExperience: data.noExperience ?? false,
      education: data.education ?? undefined,
      noEducation: data.noEducation ?? false,
      skills: data.skills ?? undefined,
      noSkills: data.noSkills ?? false,
      languages: data.languages ?? undefined,
      templateSelection: data.templateSelection ?? undefined,
    };
  }
}
