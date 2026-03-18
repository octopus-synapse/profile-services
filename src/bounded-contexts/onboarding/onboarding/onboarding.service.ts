import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { OnboardingProgress } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  buildOnboardingSteps,
  getSectionTypeFromStep,
  getStepIndex,
  isSectionStep,
  type SectionStep,
  type SectionTypeData,
} from './config/onboarding-steps.config';
import {
  type OnboardingValidationError,
  OnboardingValidationException,
} from './exceptions/onboarding.exceptions';
import { type OnboardingData, onboardingDataSchema } from './schemas/onboarding.schema';
import type { OnboardingProgressData } from './services/onboarding-progress/ports/onboarding-progress.port';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { ResumeSectionOnboardingService } from './services/resume-section-onboarding.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly auditLog: AuditLogService,
    private readonly resumeService: ResumeOnboardingService,
    private readonly sectionService: ResumeSectionOnboardingService,
    private readonly progressService: OnboardingProgressService,
  ) {}

  async completeOnboarding(userId: string, data: unknown) {
    this.logger.log('Onboarding process started', 'OnboardingService', {
      userId,
    });

    // Validate with detailed error messages
    const parseResult = onboardingDataSchema.safeParse(data);
    if (!parseResult.success) {
      const errors: OnboardingValidationError[] = parseResult.error.errors.map((err) => ({
        code: err.code,
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new OnboardingValidationException(
        'VALIDATION_FAILED',
        'Invalid onboarding data',
        errors,
      );
    }

    const validatedData = parseResult.data;
    const user = await this.findUser(userId);

    // Use transaction to ensure atomicity
    return await this.prisma
      .$transaction(
        async (tx) => {
          // Create/update resume
          const resume = await this.resumeService.upsertResumeWithTx(tx, userId, validatedData);

          this.logger.debug('Resume created/updated, processing sections', 'OnboardingService', {
            userId,
            resumeId: resume.id,
          });

          // Save all sections - generic sections format
          // Each section is processed independently, no hardcoded section types
          for (const section of validatedData.sections) {
            if (!section.noData && section.items.length > 0) {
              await this.sectionService.replaceSectionItems(tx, {
                resumeId: resume.id,
                sectionTypeKey: section.sectionTypeKey,
                items: section.items.map((item) => item.content as Prisma.InputJsonValue),
              });
            }
          }

          // Mark onboarding complete and update username
          await this.markOnboardingCompleteWithTx(tx, user.id, validatedData);

          // Delete onboarding progress within transaction for atomicity
          await this.progressService.deleteProgressWithTx(tx, userId);

          this.logger.log('Onboarding completed successfully', 'OnboardingService', {
            userId,
            resumeId: resume.id,
          });

          // Return domain data only - no envelope (controller responsibility)
          return {
            resumeId: resume.id,
          };
        },
        {
          timeout: 120000, // 120 seconds timeout - increased for bulk data inserts in integration tests
        },
      )
      .then(async (result) => {
        // Audit log AFTER transaction commits to avoid deadlock
        // AuditLogService uses its own Prisma connection, not the transaction
        await this.auditLog.logOnboardingCompleted(userId, validatedData.username, result.resumeId);
        return result;
      })
      .catch((error: unknown) => {
        // Transaction rollback with domain exception transformation - see ERROR_HANDLING_STRATEGY.md
        this.logger.error(
          'Onboarding completion failed, progress preserved',
          error instanceof Error ? error.stack : 'Unknown error',
          'OnboardingService',
          {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

        // Transform Prisma unique constraint violation into domain exception
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
          this.logger.warn('Username conflict detected during transaction', 'OnboardingService', {
            username: validatedData.username,
            userId,
          });
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

  async saveProgress(userId: string, data: OnboardingProgress) {
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
      this.logger.warn('Onboarding attempted for non-existent user', 'OnboardingService', {
        userId,
      });
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Prevent double onboarding completion
    if (user.hasCompletedOnboarding) {
      this.logger.warn('Onboarding already completed for user', 'OnboardingService', { userId });
      throw new ConflictException(ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
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

  // ==========================================================================
  // Session / Commands API
  // ==========================================================================

  /**
   * Fetch section type definitions from DB with resolved translations.
   * @param locale Locale for translations (default: 'en')
   */
  async getSectionTypeDefinitions(locale = 'en'): Promise<SectionTypeData[]> {
    const types = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: {
        key: true,
        title: true,
        description: true,
        definition: true,
        icon: true,
        iconType: true,
        translations: true,
      },
    });

    return types.map((t) => {
      // Resolve translations for the requested locale with fallback chain
      const translations = t.translations as Record<
        string,
        {
          title?: string;
          description?: string;
          label?: string;
          noDataLabel?: string;
          placeholder?: string;
          addLabel?: string;
        }
      > | null;

      const localeData = translations?.[locale] ?? translations?.['en'] ?? {};

      return {
        key: t.key,
        title: localeData.title ?? t.title,
        description: localeData.description ?? t.description ?? '',
        definition: t.definition,
        icon: t.icon,
        iconType: t.iconType,
        label: localeData.label ?? t.key,
        noDataLabel: localeData.noDataLabel ?? "I don't have items to add",
        placeholder: localeData.placeholder ?? 'Add items...',
        addLabel: localeData.addLabel ?? 'Add Item',
      };
    });
  }

  /**
   * Execute NEXT command: save step data, mark current step complete, advance.
   * Returns raw progress for controller to build session.
   */
  async executeNext(
    userId: string,
    stepData?: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const sectionTypes = await this.getSectionTypeDefinitions();
    const steps = buildOnboardingSteps(sectionTypes);
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const nextStepMeta = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

    if (!nextStepMeta) {
      throw new BadRequestException('Already at the last step');
    }

    // Build update: save step data + advance
    const update: Record<string, unknown> = {
      currentStep: nextStepMeta.id,
      completedSteps: progress.completedSteps.includes(progress.currentStep)
        ? progress.completedSteps
        : [...progress.completedSteps, progress.currentStep],
    };

    // Merge step-specific data
    if (stepData) {
      this.logger.debug('executeNext: merging step data', 'OnboardingService', {
        userId,
        currentStep: progress.currentStep,
        stepDataKeys: Object.keys(stepData),
      });
      this.mergeStepData(update, progress.currentStep, stepData, progress);
      this.logger.debug('executeNext: update after merge', 'OnboardingService', {
        userId,
        updateKeys: Object.keys(update),
        hasPersonalInfo: 'personalInfo' in update,
        hasProfessionalProfile: 'professionalProfile' in update,
      });
    }

    await this.progressService.saveProgress(userId, update as never);
    return this.progressService.getProgress(userId);
  }

  /**
   * Execute PREVIOUS command: go back one step.
   */
  async executePrevious(userId: string): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const sectionTypes = await this.getSectionTypeDefinitions();
    const steps = buildOnboardingSteps(sectionTypes);
    const currentIndex = getStepIndex(progress.currentStep, steps);
    const prevStepMeta = currentIndex > 0 ? steps[currentIndex - 1] : null;

    if (!prevStepMeta) {
      throw new BadRequestException('Already at the first step');
    }

    await this.progressService.saveProgress(userId, {
      currentStep: prevStepMeta.id,
      completedSteps: progress.completedSteps,
    } as never);
    return this.progressService.getProgress(userId);
  }

  /**
   * Execute GOTO command: jump to an accessible step.
   */
  async executeGoto(userId: string, stepId: string): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const sectionTypes = await this.getSectionTypeDefinitions();
    const steps = buildOnboardingSteps(sectionTypes);
    const targetIndex = getStepIndex(stepId, steps);

    if (targetIndex < 0) {
      throw new BadRequestException(`Unknown step: ${stepId}`);
    }

    // Allow jumping to completed steps or the current step
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

  /**
   * Execute SAVE command: save step data without advancing.
   */
  async executeSave(
    userId: string,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingProgressData> {
    const progress = await this.progressService.getProgress(userId);
    const update: Record<string, unknown> = {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };

    this.mergeStepData(update, progress.currentStep, stepData, progress);

    await this.progressService.saveProgress(userId, update as never);
    return this.progressService.getProgress(userId);
  }

  /**
   * Complete onboarding from saved progress — no payload needed from frontend.
   */
  async completeFromProgress(userId: string) {
    const progress = await this.progressService.getProgress(userId);

    // Build OnboardingData from saved progress
    const personalInfo = progress.personalInfo as Record<string, unknown> | undefined;
    const professionalProfile = progress.professionalProfile as Record<string, unknown> | undefined;
    const templateSelection = progress.templateSelection as Record<string, unknown> | undefined;

    // Detailed validation with specific errors
    const missing: string[] = [];
    const errors: OnboardingValidationError[] = [];

    if (!progress.username) {
      missing.push('username');
      errors.push({ code: 'REQUIRED', field: 'username', message: 'Username is required' });
    }

    if (!personalInfo) {
      missing.push('personalInfo');
      errors.push({
        code: 'REQUIRED',
        field: 'personalInfo',
        message: 'Personal information is required',
      });
    } else {
      this.validatePersonalInfo(personalInfo, errors);
    }

    if (!professionalProfile) {
      missing.push('professionalProfile');
      errors.push({
        code: 'REQUIRED',
        field: 'professionalProfile',
        message: 'Professional profile is required',
      });
    } else {
      this.validateProfessionalProfile(professionalProfile, errors);
    }

    if (errors.length > 0) {
      // Create detailed exception with all validation errors
      throw new OnboardingValidationException(
        missing.length > 0 ? 'ONBOARDING_INCOMPLETE' : 'VALIDATION_ERROR',
        missing.length > 0
          ? `Missing required data: ${missing.join(', ')}`
          : `Validation failed: ${errors.map((e) => e.message).join('; ')}`,
        errors,
      );
    }

    const onboardingData = {
      username: progress.username,
      personalInfo,
      professionalProfile,
      templateSelection: templateSelection ?? {},
      sections: (progress.sections ?? []).map((s) => ({
        sectionTypeKey: s.sectionTypeKey,
        items: (s.items ?? []).map((item) => {
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            return { content: (obj.content as Record<string, unknown>) ?? obj };
          }
          return { content: {} };
        }),
        noData: s.noData ?? false,
      })),
    };

    return this.completeOnboarding(userId, onboardingData);
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

  // ==========================================================================
  // Private: Merge step data into progress update
  // ==========================================================================

  private mergeStepData(
    update: Record<string, unknown>,
    currentStep: string,
    stepData: Record<string, unknown>,
    progress: OnboardingProgressData,
  ): void {
    if (isSectionStep(currentStep)) {
      // Section step: merge into sections array
      const sectionTypeKey = getSectionTypeFromStep(currentStep as SectionStep);
      const existingSections = progress.sections ?? [];
      const otherSections = existingSections.filter((s) => s.sectionTypeKey !== sectionTypeKey);
      const newSection = {
        sectionTypeKey,
        items: stepData.items ?? [],
        noData: stepData.noData ?? false,
      };
      update.sections = [...otherSections, newSection];
    } else {
      // Static step: merge known fields
      // Support both wrapped { personalInfo: {...} } and flat { fullName, email, ... } formats
      switch (currentStep) {
        case 'personal-info':
          update.personalInfo = this.extractPersonalInfo(stepData);
          break;
        case 'username':
          update.username = this.extractUsername(stepData);
          break;
        case 'professional-profile':
          update.professionalProfile = this.extractProfessionalProfile(stepData);
          break;
        case 'template':
          update.templateSelection = this.extractTemplateSelection(stepData);
          break;
        default:
          // welcome, review, complete — no data to save
          break;
      }
    }
  }

  /**
   * Extract personalInfo from step data.
   * Expected format: { personalInfo: { fullName, email, phone?, location? } }
   */
  private extractPersonalInfo(data: Record<string, unknown>): Record<string, unknown> | undefined {
    if (data.personalInfo && typeof data.personalInfo === 'object') {
      return data.personalInfo as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Extract username from step data.
   * Expected format: { username: "..." }
   */
  private extractUsername(data: Record<string, unknown>): string | undefined {
    if (typeof data.username === 'string') {
      return data.username;
    }
    return undefined;
  }

  /**
   * Extract professionalProfile from step data.
   * Expected format: { professionalProfile: { jobTitle, summary?, linkedin?, github?, website? } }
   */
  private extractProfessionalProfile(
    data: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (data.professionalProfile && typeof data.professionalProfile === 'object') {
      return data.professionalProfile as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Extract templateSelection from step data.
   * Expected format: { templateSelection: { templateId?, colorScheme? } }
   */
  private extractTemplateSelection(
    data: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (data.templateSelection && typeof data.templateSelection === 'object') {
      return data.templateSelection as Record<string, unknown>;
    }
    return undefined;
  }
}
