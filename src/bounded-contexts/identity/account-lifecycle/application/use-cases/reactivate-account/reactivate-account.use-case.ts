/**
 * Reactivate Account Use Case
 *
 * Re-enables a previously soft-deleted (deactivated) account. Mirrors
 * `DeactivateAccountUseCase` and emits `AccountReactivatedEvent` so
 * downstream listeners (notifications, analytics) can react.
 *
 * Throws `AccountAlreadyActiveException` when the target user is
 * already active — keeps the operation idempotent at the API surface
 * (callers get a 409 instead of silently succeeding).
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import {
  ReactivateAccountCommand,
  ReactivateAccountPort,
  ReactivateAccountResult,
} from '../../../application/ports';
import { AccountReactivatedEvent } from '../../../domain/events';
import { AccountAlreadyActiveException } from '../../../domain/exceptions';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class ReactivateAccountUseCase implements ReactivateAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ReactivateAccountCommand): Promise<ReactivateAccountResult> {
    const { userId } = command;

    const account = await this.repository.findById(userId);
    if (!account) {
      throw new EntityNotFoundException('Account', userId);
    }

    if (account.isActive) {
      throw new AccountAlreadyActiveException();
    }

    await this.repository.reactivate(userId);

    const event = new AccountReactivatedEvent(userId);
    this.eventBus.publish(event);

    this.logger.log(`Account ${userId} reactivated`, 'ReactivateAccountUseCase');

    return { success: true };
  }
}
