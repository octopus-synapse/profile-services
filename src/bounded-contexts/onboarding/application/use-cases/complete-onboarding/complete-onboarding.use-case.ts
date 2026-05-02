import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  OnboardingDataValidationFailedException,
  OnboardingInvalidPersonalInfoException,
  OnboardingInvalidProfessionalProfileException,
  OnboardingInvalidUsernameException,
  type OnboardingValidationError,
} from '../../../domain/exceptions/onboarding.exceptions';
import {
  OnboardingAlreadyCompletedException,
  OnboardingUsernameTakenException,
} from '../../../domain/exceptions/onboarding-extra.exceptions';
import { OnboardingRepositoryPort } from '../../../domain/ports/onboarding.port';
import type { CompletionResult } from '../../../domain/ports/onboarding-completion.port';
import { OnboardingCompletionPort } from '../../../domain/ports/onboarding-completion.port';
import {
  type OnboardingData,
  onboardingDataSchema,
} from '../../../domain/schemas/onboarding.schema';

export interface CompleteOnboardingAuditLog {
  logOnboardingCompleted: (userId: string, username: string, resumeId: string) => Promise<void>;
}

export class CompleteOnboardingUseCase {
  constructor(
    private readonly repository: OnboardingRepositoryPort,
    private readonly completionAdapter: OnboardingCompletionPort,
    private readonly logger: LoggerPort,
    private readonly auditLog: CompleteOnboardingAuditLog,
  ) {}

  async execute(userId: string, data: unknown): Promise<CompletionResult> {
    this.logger.log('Onboarding process started', 'CompleteOnboardingUseCase', { userId });

    const validatedData = this.validateOnboardingData(data);
    const user = await this.findVerifiedUser(userId);

    return this.executeCompletionWithAudit(user.id, validatedData);
  }

  private validateOnboardingData(data: unknown): OnboardingData {
    const parseResult = onboardingDataSchema.safeParse(data);
    if (parseResult.success) return parseResult.data;

    const errors: OnboardingValidationError[] = parseResult.error.errors.map((err) => ({
      code: err.code,
      field: err.path.join('.'),
      message: err.message,
    }));

    // Pick the most specific exception based on which subtree failed first;
    // catalog-parity tests expect granular codes when only one section is
    // malformed (e.g. the SDK validates each step independently).
    const root = parseResult.error.errors[0]?.path[0];
    if (root === 'username') {
      throw new OnboardingInvalidUsernameException(
        parseResult.error.errors[0]?.message ?? 'Invalid username',
      );
    }
    if (root === 'personalInfo' && errors.every((e) => e.field.startsWith('personalInfo'))) {
      throw new OnboardingInvalidPersonalInfoException(errors);
    }
    if (
      root === 'professionalProfile' &&
      errors.every((e) => e.field.startsWith('professionalProfile'))
    ) {
      throw new OnboardingInvalidProfessionalProfileException(errors);
    }
    throw new OnboardingDataValidationFailedException(errors);
  }

  private async findVerifiedUser(userId: string) {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      this.logger.warn('Onboarding attempted for non-existent user', 'CompleteOnboardingUseCase', {
        userId,
      });
      throw new EntityNotFoundException('User', userId);
    }

    if (user.hasCompletedOnboarding) {
      this.logger.warn('Onboarding already completed for user', 'CompleteOnboardingUseCase', {
        userId,
      });
      throw new OnboardingAlreadyCompletedException();
    }

    return user;
  }

  private async executeCompletionWithAudit(
    userId: string,
    validatedData: OnboardingData,
  ): Promise<CompletionResult> {
    try {
      const result = await this.completionAdapter.executeCompletion(userId, validatedData);

      this.logger.log('Onboarding completed successfully', 'CompleteOnboardingUseCase', {
        userId,
        resumeId: result.resumeId,
      });

      await this.auditLog.logOnboardingCompleted(userId, validatedData.username, result.resumeId);

      return result;
    } catch (error: unknown) {
      throw this.toDomainError(error, userId, validatedData);
    }
  }

  /** Translate an infrastructure failure into the right domain exception
   *  (or pass it through). Logs once with full context so the caller's
   *  rethrow doesn't double-log. */
  private toDomainError(error: unknown, userId: string, data: OnboardingData): unknown {
    this.logger.error(
      'Onboarding completion failed, progress preserved',
      error instanceof Error ? error.stack : 'Unknown error',
      'CompleteOnboardingUseCase',
      { userId, error: error instanceof Error ? error.message : 'Unknown error' },
    );

    if (this.isUsernameConflict(error)) {
      this.logger.warn(
        'Username conflict detected during transaction',
        'CompleteOnboardingUseCase',
        { username: data.username, userId },
      );
      return new OnboardingUsernameTakenException();
    }

    return error;
  }

  private isUsernameConflict(error: unknown): boolean {
    if (
      error === null ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    if (!('meta' in error) || error.meta === null || typeof error.meta !== 'object') {
      return false;
    }

    const target = 'target' in error.meta ? error.meta.target : undefined;
    if (Array.isArray(target)) {
      return target.some((field) => field === 'username');
    }

    if (typeof target === 'string' && target.includes('username')) {
      return true;
    }

    return error instanceof Error && error.message.includes('Unique constraint failed');
  }
}
