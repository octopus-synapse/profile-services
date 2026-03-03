import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import { EventBusPort } from '../../../shared-kernel/ports';
import { AccountDeletedEvent } from '../../domain/events';
import { AccountDeletionRequiresConfirmationException } from '../../domain/exceptions';
import {
  DELETION_CONFIRMATION_PHRASE,
  DeleteAccountCommand,
  DeleteAccountPort,
  DeleteAccountResult,
} from '../../ports/inbound';
import { AccountLifecycleRepositoryPort } from '../../ports/outbound';

const ACCOUNT_REPOSITORY = Symbol('AccountLifecycleRepositoryPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class DeleteAccountUseCase implements DeleteAccountPort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountLifecycleRepositoryPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
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

export { ACCOUNT_REPOSITORY, EVENT_BUS };
