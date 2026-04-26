import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import {
  DeactivateAccountCommand,
  DeactivateAccountPort,
  DeactivateAccountResult,
} from '../../../application/ports';
import { AccountDeactivatedEvent } from '../../../domain/events';
import { AccountDeactivatedException } from '../../../domain/exceptions';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class DeactivateAccountUseCase implements DeactivateAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
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
