import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import { EventBusPort } from '../../../shared-kernel/ports';
import { PasswordChangedEvent } from '../../domain/events';
import { InvalidCurrentPasswordException, SamePasswordException } from '../../domain/exceptions';
import { Password } from '../../domain/value-objects';
import {
  ChangePasswordCommand,
  ChangePasswordPort,
  ChangePasswordResult,
} from '../../ports/inbound';
import { PasswordHasherPort, PasswordRepositoryPort } from '../../ports/outbound';

const PASSWORD_REPOSITORY = Symbol('PasswordRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ChangePasswordUseCase implements ChangePasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(PASSWORD_HASHER)
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

    // Publish domain event
    const event = new PasswordChangedEvent(userId, 'profile');
    this.eventBus.publish(event);

    return { success: true };
  }
}

export { PASSWORD_REPOSITORY, PASSWORD_HASHER, EVENT_BUS };
