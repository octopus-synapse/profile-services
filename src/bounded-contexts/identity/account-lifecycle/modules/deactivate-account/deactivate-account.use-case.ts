import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import type { EventBusPort } from '../../../shared-kernel/ports';
import { AccountDeactivatedEvent } from '../../domain/events';
import { AccountDeactivatedException } from '../../domain/exceptions';
import {
  DeactivateAccountCommand,
  DeactivateAccountPort,
  DeactivateAccountResult,
} from '../../ports/inbound';
import type { AccountLifecycleRepositoryPort } from '../../ports/outbound';

const ACCOUNT_REPOSITORY = Symbol('AccountLifecycleRepositoryPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class DeactivateAccountUseCase implements DeactivateAccountPort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountLifecycleRepositoryPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: DeactivateAccountCommand): Promise<DeactivateAccountResult> {
    const { userId, reason } = command;

    // Find account
    const account = await this.repository.findById(userId);
    if (!account) {
      throw new EntityNotFoundException('Account', userId);
    }

    // Check if already deactivated
    if (!account.isActive) {
      throw new AccountDeactivatedException();
    }

    // Deactivate account
    await this.repository.deactivate(userId);

    // Publish domain event
    const event = new AccountDeactivatedEvent(userId, reason);
    this.eventBus.publish(event);

    return { success: true };
  }
}

export { ACCOUNT_REPOSITORY, EVENT_BUS };
