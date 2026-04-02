import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { PasswordChangedEvent } from '../../../domain/events';
import type {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetTokenPort,
  SessionInvalidationPort,
} from '../../../domain/ports';
import {
  PASSWORD_HASHER_PORT,
  PASSWORD_REPOSITORY_PORT,
  PASSWORD_RESET_TOKEN_PORT,
  SESSION_INVALIDATION_PORT,
} from '../../../domain/ports';
import { Password } from '../../../domain/value-objects';
import type { ResetPasswordCommand, ResetPasswordPort, ResetPasswordResult } from '../../ports';

const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ResetPasswordUseCase implements ResetPasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY_PORT)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly tokenService: PasswordResetTokenPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(SESSION_INVALIDATION_PORT)
    private readonly sessionInvalidation: SessionInvalidationPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordResult> {
    const { token, newPassword } = command;

    // Validate password strength (throws WeakPasswordException if invalid)
    Password.create(newPassword);

    // Atomically validate and consume token (prevents race conditions)
    // The token is deleted within the same transaction as validation
    const userId = await this.tokenService.validateAndConsumeToken(token);

    // Hash the new password
    const hashedPassword = await this.passwordHasher.hash(newPassword);

    // Update password
    await this.passwordRepository.updatePassword(userId, hashedPassword);

    // SYNCHRONOUS session invalidation - must complete before returning
    // This ensures old tokens are invalidated immediately (no race conditions)
    await this.sessionInvalidation.invalidateAllSessions(userId);

    // Publish domain event for audit/notifications (fire and forget)
    const event = new PasswordChangedEvent(userId, 'reset');
    this.eventBus.publish(event);

    return { success: true };
  }
}

export { EVENT_BUS };
