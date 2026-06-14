import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../shared-kernel/ports/event-bus.port';
import { PasswordChangedEvent } from '../../domain/events';
import { InvalidPasswordChangeCodeException } from '../../domain/exceptions';
import {
  PasswordRepositoryPort,
  SessionInvalidationPort,
  VerificationCodeStorePort,
} from '../../domain/ports';
import type {
  ConfirmPasswordChangeCommand,
  ConfirmPasswordChangePort,
  ConfirmPasswordChangeResult,
} from '../ports';

export class ConfirmPasswordChangeUseCase implements ConfirmPasswordChangePort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly sessionInvalidation: SessionInvalidationPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ConfirmPasswordChangeCommand): Promise<ConfirmPasswordChangeResult> {
    const { userId, code } = command;

    const pending = await this.codeStore.findPurposeToken(userId, code, 'PASSWORD_CHANGE');
    if (!pending || !pending.pendingPasswordHash) {
      throw new InvalidPasswordChangeCodeException();
    }

    await this.passwordRepository.updatePassword(userId, pending.pendingPasswordHash);
    await this.codeStore.deleteUserPurposeTokens(userId, 'PASSWORD_CHANGE');

    // Synchronous session invalidation — old tokens die immediately.
    await this.sessionInvalidation.invalidateAllSessions(userId);

    this.eventBus.publish(new PasswordChangedEvent(userId, 'profile'));
    this.logger.log('Password changed via two-step flow', 'ConfirmPasswordChangeUseCase');

    return { success: true };
  }
}
