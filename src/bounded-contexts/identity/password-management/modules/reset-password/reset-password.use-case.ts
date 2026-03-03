import { Inject, Injectable } from '@nestjs/common';
import { EventBusPort } from '../../../shared-kernel/ports';
import { PasswordChangedEvent } from '../../domain/events';
import { Password } from '../../domain/value-objects';
import { ResetPasswordCommand, ResetPasswordPort, ResetPasswordResult } from '../../ports/inbound';
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetTokenPort,
} from '../../ports/outbound';

const PASSWORD_REPOSITORY = Symbol('PasswordRepositoryPort');
const TOKEN_SERVICE = Symbol('PasswordResetTokenPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ResetPasswordUseCase implements ResetPasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: PasswordResetTokenPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordResult> {
    const { token, newPassword } = command;

    // Validate password strength (throws WeakPasswordException if invalid)
    Password.create(newPassword);

    // Validate token and get user ID (throws InvalidResetTokenException if invalid)
    const userId = await this.tokenService.validateToken(token);

    // Hash the new password
    const hashedPassword = await this.passwordHasher.hash(newPassword);

    // Update password
    await this.passwordRepository.updatePassword(userId, hashedPassword);

    // Invalidate the used token
    await this.tokenService.invalidateToken(token);

    // Publish domain event
    const event = new PasswordChangedEvent(userId, 'reset');
    this.eventBus.publish(event);

    return { success: true };
  }
}

export { PASSWORD_REPOSITORY, TOKEN_SERVICE, PASSWORD_HASHER, EVENT_BUS };
