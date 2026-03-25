import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type OnboardingValidationError,
  OnboardingValidationException,
} from '../exceptions/onboarding.exceptions';
import { type OnboardingData, onboardingDataSchema } from '../schemas/onboarding.schema';
import type { OnboardingProgressData } from './onboarding-progress/ports/onboarding-progress.port';
import { OnboardingProgressService } from './onboarding-progress.service';
import { ResumeOnboardingService } from './resume-onboarding.service';
import { ResumeSectionOnboardingService } from './resume-section-onboarding.service';

@Injectable()
export class OnboardingCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly auditLog: AuditLogService,
    private readonly resumeService: ResumeOnboardingService,
    private readonly sectionService: ResumeSectionOnboardingService,
    private readonly progressService: OnboardingProgressService,
  ) {}

  async completeOnboarding(userId: string, data: unknown) {
    this.logger.log('Onboarding process started', 'OnboardingCompletionService', { userId });

    const validatedData = this.validateOnboardingData(data);
    const user = await this.findVerifiedUser(userId);

    return this.executeCompletionTransaction(user.id, validatedData);
  }

  async completeFromProgress(userId: string) {
    const progress = await this.progressService.getProgress(userId);
    const onboardingData = this.buildOnboardingDataFromProgress(progress);
    return this.completeOnboarding(userId, onboardingData);
  }

  private validateOnboardingData(data: unknown): OnboardingData {
    const parseResult = onboardingDataSchema.safeParse(data);
    if (parseResult.success) return parseResult.data;

    const errors: OnboardingValidationError[] = parseResult.error.errors.map((err) => ({
      code: err.code,
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new OnboardingValidationException('VALIDATION_FAILED', 'Invalid onboarding data', errors);
  }

  private async findVerifiedUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      this.logger.warn(
        'Onboarding attempted for non-existent user',
        'OnboardingCompletionService',
        { userId },
      );
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.hasCompletedOnboarding) {
      this.logger.warn('Onboarding already completed for user', 'OnboardingCompletionService', {
        userId,
      });
      throw new ConflictException(ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
    }

    return user;
  }

  private async executeCompletionTransaction(userId: string, validatedData: OnboardingData) {
    const TRANSACTION_TIMEOUT_MS = 120000;

    return this.prisma
      .$transaction(
        async (tx) => {
          const resume = await this.resumeService.upsertResumeWithTx(tx, userId, validatedData);
          await this.saveSections(tx, resume.id, validatedData);
          await this.markOnboardingComplete(tx, userId, validatedData);
          await this.progressService.deleteProgressWithTx(tx, userId);

          this.logger.log('Onboarding completed successfully', 'OnboardingCompletionService', {
            userId,
            resumeId: resume.id,
          });
          return { resumeId: resume.id };
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      )
      .then(async (result) => {
        await this.auditLog.logOnboardingCompleted(userId, validatedData.username, result.resumeId);
        return result;
      })
      .catch((error: unknown) => {
        this.handleTransactionError(error, userId, validatedData);
      });
  }

  private async saveSections(tx: Prisma.TransactionClient, resumeId: string, data: OnboardingData) {
    for (const section of data.sections) {
      if (!section.noData && section.items.length > 0) {
        await this.sectionService.replaceSectionItems(tx, {
          resumeId,
          sectionTypeKey: section.sectionTypeKey,
          items: section.items.map((item) => item.content as Prisma.InputJsonValue),
        });
      }
    }
  }

  private async markOnboardingComplete(
    tx: Prisma.TransactionClient,
    userId: string,
    data: OnboardingData,
  ) {
    await tx.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        username: data.username,
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

  private handleTransactionError(error: unknown, userId: string, data: OnboardingData): never {
    this.logger.error(
      'Onboarding completion failed, progress preserved',
      error instanceof Error ? error.stack : 'Unknown error',
      'OnboardingCompletionService',
      { userId, error: error instanceof Error ? error.message : 'Unknown error' },
    );

    if (this.isUsernameConflict(error)) {
      this.logger.warn(
        'Username conflict detected during transaction',
        'OnboardingCompletionService',
        {
          username: data.username,
          userId,
        },
      );
      throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
    }

    throw error;
  }

  private isUsernameConflict(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta !== null &&
      typeof error.meta === 'object' &&
      'target' in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes('username')
    );
  }

  private buildOnboardingDataFromProgress(progress: OnboardingProgressData) {
    const personalInfo = progress.personalInfo as Record<string, unknown> | undefined;
    const professionalProfile = progress.professionalProfile as Record<string, unknown> | undefined;
    const templateSelection = progress.templateSelection as Record<string, unknown> | undefined;

    this.validateProgressCompleteness(
      progress.username ?? undefined,
      personalInfo,
      professionalProfile,
    );

    return {
      username: progress.username,
      personalInfo,
      professionalProfile,
      templateSelection: templateSelection ?? {},
      sections: this.mapProgressSections(progress),
    };
  }

  private validateProgressCompleteness(
    username: string | undefined,
    personalInfo: Record<string, unknown> | undefined,
    professionalProfile: Record<string, unknown> | undefined,
  ): void {
    const errors: OnboardingValidationError[] = [];

    if (!username) {
      errors.push({ code: 'REQUIRED', field: 'username', message: 'Username is required' });
    }

    if (!personalInfo) {
      errors.push({
        code: 'REQUIRED',
        field: 'personalInfo',
        message: 'Personal information is required',
      });
    } else {
      this.validatePersonalInfo(personalInfo, errors);
    }

    if (!professionalProfile) {
      errors.push({
        code: 'REQUIRED',
        field: 'professionalProfile',
        message: 'Professional profile is required',
      });
    } else {
      this.validateProfessionalProfile(professionalProfile, errors);
    }

    if (errors.length > 0) {
      const missingFields = errors.filter((e) => e.code === 'REQUIRED').map((e) => e.field);
      throw new OnboardingValidationException(
        missingFields.length > 0 ? 'ONBOARDING_INCOMPLETE' : 'VALIDATION_ERROR',
        missingFields.length > 0
          ? `Missing required data: ${missingFields.join(', ')}`
          : `Validation failed: ${errors.map((e) => e.message).join('; ')}`,
        errors,
      );
    }
  }

  private validatePersonalInfo(data: Record<string, unknown>, errors: OnboardingValidationError[]) {
    if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length === 0) {
      errors.push({
        code: 'REQUIRED',
        field: 'personalInfo.fullName',
        message: 'Full name is required',
      });
    }
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push({
        code: 'INVALID_EMAIL',
        field: 'personalInfo.email',
        message: 'Valid email is required',
      });
    }
  }

  private validateProfessionalProfile(
    data: Record<string, unknown>,
    errors: OnboardingValidationError[],
  ) {
    if (!data.jobTitle || typeof data.jobTitle !== 'string' || data.jobTitle.trim().length === 0) {
      errors.push({
        code: 'REQUIRED',
        field: 'professionalProfile.jobTitle',
        message: 'Job title is required',
      });
    }
  }

  private mapProgressSections(progress: OnboardingProgressData) {
    return (progress.sections ?? []).map((s) => ({
      sectionTypeKey: s.sectionTypeKey,
      items: (s.items ?? []).map((item) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return { content: (obj.content as Record<string, unknown>) ?? obj };
        }
        return { content: {} };
      }),
      noData: s.noData ?? false,
    }));
  }
}
