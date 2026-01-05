import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import type { Prisma } from '@prisma/client';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../common/constants/config';
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
    private readonly auditLog: AuditLogService,
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

    // Use transaction to ensure atomicity
    return await this.prisma
      .$transaction(
        async (tx) => {
          // Create/update resume
          const resume = await this.resumeService.upsertResumeWithTx(
            tx,
            userId,
            validatedData,
          );

          this.logger.debug(
            'Resume created/updated, processing sections',
            'OnboardingService',
            {
              userId,
              resumeId: resume.id,
            },
          );

          // Save all sections in parallel
          await Promise.all([
            this.skillsService.saveSkillsWithTx(tx, resume.id, validatedData),
            this.experienceService.saveExperiencesWithTx(
              tx,
              resume.id,
              validatedData,
            ),
            this.educationService.saveEducationWithTx(
              tx,
              resume.id,
              validatedData,
            ),
            this.languagesService.saveLanguagesWithTx(
              tx,
              resume.id,
              validatedData,
            ),
          ]);

          // Mark onboarding complete and update username
          await this.markOnboardingCompleteWithTx(tx, user.id, validatedData);

          // Delete onboarding progress within transaction for atomicity
          await this.progressService.deleteProgressWithTx(tx, userId);

          // Audit log: Track onboarding completion
          await this.auditLog.logOnboardingCompleted(
            userId,
            validatedData.username,
            resume.id,
          );

          this.logger.log(
            'Onboarding completed successfully',
            'OnboardingService',
            {
              userId,
              resumeId: resume.id,
            },
          );

          return {
            success: true,
            resumeId: resume.id,
            message: SUCCESS_MESSAGES.ONBOARDING_COMPLETED,
          };
        },
        {
          timeout: 30000, // 30 seconds timeout
        },
      )
      .catch((error: unknown) => {
        // If anything fails, don't delete progress so user can retry
        this.logger.error(
          'Onboarding completion failed, progress preserved',
          error instanceof Error ? error.stack : 'Unknown error',
          'OnboardingService',
          {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

        // Check for unique constraint violation on username
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002' &&
          'meta' in error &&
          error.meta &&
          typeof error.meta === 'object' &&
          'target' in error.meta &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes('username')
        ) {
          this.logger.warn(
            'Username conflict detected during transaction',
            'OnboardingService',
            { username: validatedData.username, userId },
          );
          throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
        }

        throw error;
      });
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
    return this.markOnboardingCompleteWithTx(this.prisma, userId, data);
  }

  private async markOnboardingCompleteWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
  ) {
    // Update user with profile data from onboarding
    await tx.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        username: data.username,
        // Sync profile data from onboarding to user table for settings
        displayName: data.personalInfo.fullName,
        phone: data.personalInfo.phone ?? null,
        location: data.personalInfo.location ?? null,
        bio: data.professionalProfile.summary,
        linkedin: data.professionalProfile.linkedin ?? null,
        github: data.professionalProfile.github ?? null,
        website: data.professionalProfile.website ?? null,
      },
    });
  }

  /**
   * Username uniqueness is now enforced by database unique constraint.
   * This eliminates the TOCTOU race condition that existed with the previous
   * check-then-update pattern. The database will atomically reject duplicate
   * usernames during the transaction commit.
   */
}
