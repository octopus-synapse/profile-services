import { LoggerPort } from '@/shared-kernel';
import {
  EmailAlreadyInUseException,
  InvalidEmailChangeCodeException,
} from '../../domain/exceptions';
import {
  PasswordRepositoryPort,
  SessionInvalidationPort,
  VerificationCodeStorePort,
} from '../../domain/ports';
import type {
  ConfirmEmailChangeCommand,
  ConfirmEmailChangePort,
  ConfirmEmailChangeResult,
} from '../ports';

export class ConfirmEmailChangeUseCase implements ConfirmEmailChangePort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly sessionInvalidation: SessionInvalidationPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ConfirmEmailChangeCommand): Promise<ConfirmEmailChangeResult> {
    const { userId, code } = command;

    const pending = await this.codeStore.findPurposeToken(userId, code, 'EMAIL_CHANGE');
    if (!pending || !pending.pendingEmail) {
      throw new InvalidEmailChangeCodeException();
    }

    // Re-check in case the address was claimed between request and confirm.
    if (await this.passwordRepository.emailExists(pending.pendingEmail)) {
      throw new EmailAlreadyInUseException();
    }

    await this.passwordRepository.updateEmail(userId, pending.pendingEmail);
    await this.codeStore.deleteUserPurposeTokens(userId, 'EMAIL_CHANGE');

    // Identity changed — drop all sessions so the user re-authenticates.
    await this.sessionInvalidation.invalidateAllSessions(userId);

    this.logger.log('Email changed via two-step flow', 'ConfirmEmailChangeUseCase');
    return { newEmail: pending.pendingEmail };
  }
}
