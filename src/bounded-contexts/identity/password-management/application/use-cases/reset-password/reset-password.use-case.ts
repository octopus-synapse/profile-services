import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { PasswordChangedEvent } from '../../../domain/events';
import {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetTokenPort,
  SessionInvalidationPort,
} from '../../../domain/ports';
import { Password } from '../../../domain/value-objects';
import type { ResetPasswordCommand, ResetPasswordPort, ResetPasswordResult } from '../../ports';

export class ResetPasswordUseCase implements ResetPasswordPort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly tokenService: PasswordResetTokenPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionInvalidation: SessionInvalidationPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
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
