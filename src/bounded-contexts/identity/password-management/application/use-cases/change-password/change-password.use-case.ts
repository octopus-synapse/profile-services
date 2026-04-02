import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { PasswordChangedEvent } from '../../../domain/events';
import { InvalidCurrentPasswordException, SamePasswordException } from '../../../domain/exceptions';
import type { PasswordHasherPort, PasswordRepositoryPort } from '../../../domain/ports';
import { PASSWORD_HASHER_PORT, PASSWORD_REPOSITORY_PORT } from '../../../domain/ports';
import { Password } from '../../../domain/value-objects';
import type { ChangePasswordCommand, ChangePasswordPort, ChangePasswordResult } from '../../ports';

const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ChangePasswordUseCase implements ChangePasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY_PORT)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(EVENT_BUS)
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

    // Publish domain event (await to ensure handlers complete before returning)
    const event = new PasswordChangedEvent(userId, 'profile');
    await this.eventBus.publish(event);

    return { success: true };
  }
}

export { EVENT_BUS };
