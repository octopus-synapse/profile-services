import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException, UnauthorizedException } from '@/shared-kernel/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import {
  DELETION_CONFIRMATION_PHRASE,
  DeleteAccountCommand,
  DeleteAccountPort,
  DeleteAccountResult,
} from '../../../application/ports';
import { AccountDeletedEvent } from '../../../domain/events';
import { AccountDeletionRequiresConfirmationException } from '../../../domain/exceptions';
import type { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { AccountLifecycleRepositoryPort } from '../../../domain/ports';

export class DeleteAccountUseCase implements DeleteAccountPort {
  constructor(
    private readonly repository: AccountLifecycleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    const { userId, confirmationPhrase, currentPassword } = command;

    // Verify confirmation phrase
    if (confirmationPhrase !== DELETION_CONFIRMATION_PHRASE) {
      throw new AccountDeletionRequiresConfirmationException();
    }

    // P0-#8 follow-up: re-prove credential ownership before erasing the
    // account. Stops cookie-only attackers from deleting accounts they
    // briefly hijack.
    const storedHash = await this.repository.findPasswordHashById(userId);
    if (!storedHash) {
      // No password set (OAuth-only sign-up) → today we can't satisfy the
      // re-auth gate; refuse and let the user reset password first.
      throw new UnauthorizedException('Re-authentication required');
    }
    const passwordOk = await this.passwordHasher.compare(currentPassword, storedHash);
    if (!passwordOk) {
      this.logger.warn(`Delete-account re-auth failed for user ${userId}`, 'DeleteAccountUseCase');
      throw new UnauthorizedException('Invalid credentials');
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
