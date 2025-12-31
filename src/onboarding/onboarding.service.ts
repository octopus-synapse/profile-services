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
import { OnboardingProgressService } from './services/onboarding-progress.service';
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
    private readonly progressService: OnboardingProgressService,
  ) {}

  async completeOnboarding(userId: string, data: unknown) {
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
    await this.progressService.deleteProgress(userId);

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

  async saveProgress(userId: string, data: OnboardingProgressDto) {
    return this.progressService.saveProgress(userId, data);
  }

  async getProgress(userId: string) {
    return this.progressService.getProgress(userId);
  }

  async deleteProgress(userId: string) {
    return this.progressService.deleteProgress(userId);
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      this.logger.warn(
        'Onboarding attempted for non-existent user',
        'OnboardingService',
        { userId },
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
        username: data.username,
      },
    });
  }
}
