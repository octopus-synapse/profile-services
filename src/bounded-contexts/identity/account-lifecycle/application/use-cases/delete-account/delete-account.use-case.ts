import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import {
  DELETION_CONFIRMATION_PHRASE,
  DeleteAccountCommand,
  DeleteAccountPort,
  DeleteAccountResult,
} from '../../../application/ports';
import { AccountDeletedEvent } from '../../../domain/events';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class DeleteAccountUseCase implements DeleteAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    const { userId, confirmationPhrase } = command;

    // Verify confirmation phrase
    if (confirmationPhrase !== DELETION_CONFIRMATION_PHRASE) {
      throw new AccountDeletionRequiresConfirmationException();
    }

    // Find account
    const account = await this.repository.findById(userId);
    if (!account) {
      throw new EntityNotFoundException('Account', userId);
    }

    // Store email before deletion (for the event)
    const email = account.email;

    // Permanently delete account
    await this.repository.delete(userId);

    // Publish domain event
    const event = new AccountDeletedEvent(userId, email);
    this.eventBus.publish(event);

    return { success: true };
  }
}
