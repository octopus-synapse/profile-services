import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import { EventBusPort } from '../../../shared-kernel/ports';
import { VerificationEmailSentEvent } from '../../domain/events';
import {
  EmailAlreadyVerifiedException,
  VerificationTokenAlreadySentException,
} from '../../domain/exceptions';
import { EmailVerificationToken } from '../../domain/value-objects';
import { SendVerificationEmailCommand, SendVerificationEmailPort } from '../../ports/inbound';
import { EmailVerificationRepositoryPort, VerificationEmailSenderPort } from '../../ports/outbound';

const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepositoryPort');
const EMAIL_SENDER = Symbol('VerificationEmailSenderPort');
const EVENT_BUS = Symbol('EventBusPort');

// Rate limit: 5 minutes between verification emails
const RATE_LIMIT_MINUTES = 5;

@Injectable()
export class SendVerificationEmailUseCase implements SendVerificationEmailPort {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly repository: EmailVerificationRepositoryPort,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: VerificationEmailSenderPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: SendVerificationEmailCommand): Promise<void> {
    const { userId } = command;

    // Find user
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new EmailAlreadyVerifiedException(user.email);
    }

    // Check rate limit
    const hasRecent = await this.repository.hasRecentToken(userId, RATE_LIMIT_MINUTES);
    if (hasRecent) {
      throw new VerificationTokenAlreadySentException(RATE_LIMIT_MINUTES);
    }

    // Generate new token
    const token = EmailVerificationToken.generateNew();

    // Delete any existing tokens and create new one
    await this.repository.deleteUserVerificationTokens(userId);
    await this.repository.createVerificationToken(
      userId,
      token.getValue(),
      token.getExpiresAt(),
      user.email,
    );

    // Send verification email
    await this.emailSender.sendVerificationEmail(
      user.email,
      null, // Could fetch user name if needed
      token.getValue(),
    );

    // Publish domain event
    const event = new VerificationEmailSentEvent(userId, user.email);
    this.eventBus.publish(event);
  }
}

export { EMAIL_VERIFICATION_REPOSITORY, EMAIL_SENDER, EVENT_BUS };
