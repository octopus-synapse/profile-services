import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../shared-kernel/ports';
import { PasswordResetRequestedEvent } from '../../domain/events';
import { PasswordResetToken } from '../../domain/value-objects';
import type { ForgotPasswordCommand, ForgotPasswordPort } from '../../ports/inbound';
import type {
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
} from '../../ports/outbound';

const PASSWORD_REPOSITORY = Symbol('PasswordRepositoryPort');
const TOKEN_SERVICE = Symbol('PasswordResetTokenPort');
const EMAIL_SENDER = Symbol('PasswordResetEmailPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class ForgotPasswordUseCase implements ForgotPasswordPort {
  constructor(
    @Inject(PASSWORD_REPOSITORY)
    private readonly passwordRepository: PasswordRepositoryPort,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: PasswordResetTokenPort,
    @Inject(EMAIL_SENDER)
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

export { PASSWORD_REPOSITORY, TOKEN_SERVICE, EMAIL_SENDER, EVENT_BUS };
