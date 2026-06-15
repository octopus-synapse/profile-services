import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { VerificationCodeStorePort } from '../../../../password-management/domain/ports';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import {
  type ConfirmAccountDeletionCommand,
  ConfirmAccountDeletionPort,
  type ConfirmAccountDeletionResult,
} from '../../../application/ports';
import { AccountDeletedEvent } from '../../../domain/events';
import { InvalidAccountDeletionCodeException } from '../../../domain/exceptions';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class ConfirmAccountDeletionUseCase implements ConfirmAccountDeletionPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly codeStore: VerificationCodeStorePort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ConfirmAccountDeletionCommand): Promise<ConfirmAccountDeletionResult> {
    const { userId, code } = command;

    const pending = await this.codeStore.findPurposeToken(userId, code, 'ACCOUNT_DELETION');
    if (!pending) {
      throw new InvalidAccountDeletionCodeException();
    }

    const account = await this.repository.findById(userId);
    if (!account) {
      throw new EntityNotFoundException('Account', userId);
    }
    const email = account.email;

    // Hard delete (GDPR erasure) + consume the code so it can't be replayed.
    await this.repository.delete(userId);
    await this.codeStore.deleteUserPurposeTokens(userId, 'ACCOUNT_DELETION');

    this.eventBus.publish(new AccountDeletedEvent(userId, email));
    this.logger.log('Account deleted via two-step flow', 'ConfirmAccountDeletionUseCase');

    return { success: true };
  }
}
