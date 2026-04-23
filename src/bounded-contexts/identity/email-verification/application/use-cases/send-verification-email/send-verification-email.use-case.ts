import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { VerificationEmailSentEvent } from '../../../domain/events';
import {
  EmailAlreadyVerifiedException,
  VerificationTokenAlreadySentException,
} from '../../../domain/exceptions';
import type {
  EmailVerificationRepositoryPort,
  VerificationEmailSenderPort,
} from '../../../domain/ports';
import { EmailVerificationToken } from '../../../domain/value-objects';
import type {
  ResendCooldown,
  SendVerificationEmailCommand,
  SendVerificationEmailPort,
} from '../../ports';

const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepositoryPort');
const EMAIL_SENDER = Symbol('VerificationEmailSenderPort');
const EVENT_BUS = Symbol('EventBusPort');

// Cooldown between verification emails. Source of truth for the UI timer —
// exposed via GET /email-verification/resend-status.
export const RESEND_COOLDOWN_SECONDS = 60;

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

  async execute(command: SendVerificationEmailCommand): Promise<ResendCooldown> {
    const { userId } = command;

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    if (user.emailVerified) {
      throw new EmailAlreadyVerifiedException(user.email);
    }

    const lastCreatedAt = await this.repository.getLastTokenCreatedAt(userId);
    if (lastCreatedAt) {
      const elapsedMs = Date.now() - lastCreatedAt.getTime();
      const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
      if (remainingMs > 0) {
        throw new VerificationTokenAlreadySentException(Math.ceil(remainingMs / 1000));
      }
    }

    const token = EmailVerificationToken.generateNew();

    await this.repository.deleteUserVerificationTokens(userId);
    await this.repository.createVerificationToken(
      userId,
      token.getValue(),
      token.getExpiresAt(),
      user.email,
    );

    await this.emailSender.sendVerificationEmail(user.email, null, token.getValue());

    const event = new VerificationEmailSentEvent(userId, user.email);
    this.eventBus.publish(event);

    return {
      secondsUntilResendAllowed: RESEND_COOLDOWN_SECONDS,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }
}
