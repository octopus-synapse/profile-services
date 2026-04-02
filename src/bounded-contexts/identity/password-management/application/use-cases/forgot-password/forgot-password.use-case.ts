import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { PasswordResetRequestedEvent } from '../../../domain/events';
import type {
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
} from '../../../domain/ports';
import {
  PASSWORD_REPOSITORY_PORT,
  PASSWORD_RESET_EMAIL_PORT,
  PASSWORD_RESET_TOKEN_PORT,
} from '../../../domain/ports';
import { PasswordResetToken } from '../../../domain/value-objects';
import type { ForgotPasswordCommand, ForgotPasswordPort } from '../../ports';

const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ForgotPasswordUseCase implements ForgotPasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY_PORT)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(PASSWORD_RESET_TOKEN_PORT)
    private readonly tokenService: PasswordResetTokenPort,
    @Inject(PASSWORD_RESET_EMAIL_PORT)
    private readonly emailSender: PasswordResetEmailPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
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

export { EVENT_BUS };
