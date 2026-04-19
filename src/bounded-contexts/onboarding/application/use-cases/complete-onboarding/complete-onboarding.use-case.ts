import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  ConflictException,
  EntityNotFoundException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import {
  type OnboardingValidationError,
  OnboardingValidationException,
} from '../../../domain/exceptions/onboarding.exceptions';
import type { OnboardingRepositoryPort } from '../../../domain/ports/onboarding.port';
import type {
  CompletionResult,
  OnboardingCompletionPort,
} from '../../../domain/ports/onboarding-completion.port';
import {
  type OnboardingData,
  onboardingDataSchema,
} from '../../../domain/schemas/onboarding.schema';

export interface CompleteOnboardingLogger {
  log: (msg: string, ctx: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, ctx: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, trace?: string, ctx?: string, meta?: Record<string, unknown>) => void;
}

export interface CompleteOnboardingAuditLog {
  logOnboardingCompleted: (userId: string, username: string, resumeId: string) => Promise<void>;
}

export class CompleteOnboardingUseCase {
  constructor(
    private readonly repository: OnboardingRepositoryPort,
    private readonly completionAdapter: OnboardingCompletionPort,
    private readonly logger: CompleteOnboardingLogger,
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
    throw new OnboardingValidationException('VALIDATION_FAILED', 'Invalid onboarding data', errors);
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
      throw new ConflictException(ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETED);
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
      this.handleTransactionError(error, userId, validatedData);
    }
  }

  private handleTransactionError(error: unknown, userId: string, data: OnboardingData): never {
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
