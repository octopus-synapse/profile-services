import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { PasswordChangedEvent } from '../../../domain/events';
import { InvalidCurrentPasswordException, SamePasswordException } from '../../../domain/exceptions';
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  SessionInvalidationPort,
} from '../../../domain/ports';
import { Password } from '../../../domain/value-objects';
import type { ChangePasswordCommand, ChangePasswordPort, ChangePasswordResult } from '../../ports';

export class ChangePasswordUseCase implements ChangePasswordPort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionInvalidation: SessionInvalidationPort,
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<ChangePasswordResult> {
    const { userId, currentPassword, newPassword } = command;

    // Validate new password strength (throws WeakPasswordException if invalid)
    Password.create(newPassword);

    // Get user with current password hash
    const user = await this.passwordRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordHasher.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new InvalidCurrentPasswordException();
    }

    // Check if new password is the same as current
    const isSamePassword = await this.passwordHasher.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new SamePasswordException();
    }

    // Hash the new password
    const hashedPassword = await this.passwordHasher.hash(newPassword);

    // Update password
    await this.passwordRepository.updatePassword(userId, hashedPassword);

    // SYNCHRONOUS session invalidation - must complete before returning
    // This ensures old tokens are invalidated immediately (no race conditions)
    await this.sessionInvalidation.invalidateAllSessions(userId);

    // Publish domain event for audit/notifications (fire and forget)
    const event = new PasswordChangedEvent(userId, 'profile');
    this.eventBus.publish(event);

    return { success: true };
  }
}
