import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../common/constants/app.constants';
import {
  onboardingDataSchema,
  OnboardingData,
} from './schemas/onboarding.schema';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';
import { OnboardingProgressDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly resumeService: ResumeOnboardingService,
    private readonly skillsService: SkillsOnboardingService,
    private readonly experienceService: ExperienceOnboardingService,
    private readonly educationService: EducationOnboardingService,
    private readonly languagesService: LanguagesOnboardingService,
  ) {}

  async completeOnboarding(userId: string, data: any) {
    this.logger.log('Onboarding process started', 'OnboardingService', {
      userId,
    });

    const validatedData = onboardingDataSchema.parse(data);

    const user = await this.findUser(userId);
    const resume = await this.resumeService.upsertResume(userId, validatedData);

    this.logger.debug(
      'Resume created/updated, processing sections',
      'OnboardingService',
      {
        userId,
        resumeId: resume.id,
      },
    );

    await Promise.all([
      this.skillsService.saveSkills(resume.id, validatedData),
      this.experienceService.saveExperiences(resume.id, validatedData),
      this.educationService.saveEducation(resume.id, validatedData),
      this.languagesService.saveLanguages(resume.id, validatedData),
    ]);

    await this.markOnboardingComplete(user.id, validatedData);

    // Clean up progress after successful completion
    await this.deleteProgress(userId);

    this.logger.log('Onboarding completed successfully', 'OnboardingService', {
      userId,
      resumeId: resume.id,
    });

    return {
      success: true,
      resumeId: resume.id,
      message: SUCCESS_MESSAGES.ONBOARDING_COMPLETED,
    };
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      this.logger.warn(
        'Onboarding attempted for non-existent user',
        'OnboardingService',
        {
          userId,
        },
      );
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  private async markOnboardingComplete(userId: string, data: OnboardingData) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        palette: data.templateSelection.palette,
      },
    });
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }

  /**
   * Save onboarding progress (checkpoint)
   */
  async saveProgress(userId: string, data: OnboardingProgressDto) {
    this.logger.debug('Saving onboarding progress', 'OnboardingService', {
      userId,
      currentStep: data.currentStep,
    });

    const progress = await this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: {
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
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
      },
      create: {
        userId,
        currentStep: data.currentStep,
        completedSteps: data.completedSteps,
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
      },
    });

    return {
      success: true,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };
  }

  /**
   * Get onboarding progress (checkpoint)
   */
  async getProgress(userId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Return initial state if no progress saved
      return {
        currentStep: 'welcome',
        completedSteps: [],
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
    }

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
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

  /**
   * Delete onboarding progress after completion
   */
  async deleteProgress(userId: string) {
    await this.prisma.onboardingProgress.deleteMany({
      where: { userId },
    });
  }
}
