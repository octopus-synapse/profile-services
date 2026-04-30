import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { PasswordResetRequestedEvent } from '../../../domain/events';
import {
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
} from '../../../domain/ports';
import { PasswordResetToken } from '../../../domain/value-objects';
import type { ForgotPasswordCommand, ForgotPasswordPort } from '../../ports';

export class ForgotPasswordUseCase implements ForgotPasswordPort {
  constructor(
    private readonly passwordRepository: PasswordRepositoryPort,
    private readonly tokenService: PasswordResetTokenPort,
    private readonly emailSender: PasswordResetEmailPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const { email } = command;

    // Find user - if not found, silently return (prevent email enumeration)
    const user = await this.passwordRepository.findByEmail(email);
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = PasswordResetToken.generateNew();
    const tokenValue = resetToken.getValue();

    // Store token
    await this.tokenService.createToken(user.id, tokenValue);

    // Send email
    await this.emailSender.sendResetEmail(email, user.name, tokenValue);

    // Publish domain event
    const event = new PasswordResetRequestedEvent(user.id, email);
    this.eventBus.publish(event);
  }
}
