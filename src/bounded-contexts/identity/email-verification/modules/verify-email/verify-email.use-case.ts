import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared-kernel/exceptions';
import { EventBusPort } from '../../../shared-kernel/ports';
import { EmailVerifiedEvent } from '../../domain/events';
import {
  EmailAlreadyVerifiedException,
  InvalidVerificationTokenException,
} from '../../domain/exceptions';
import { VerifyEmailCommand, VerifyEmailPort, VerifyEmailResult } from '../../ports/inbound';
import { EmailVerificationRepositoryPort } from '../../ports/outbound';

const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepositoryPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class VerifyEmailUseCase implements VerifyEmailPort {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly repository: EmailVerificationRepositoryPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
    const { token } = command;

    // Find token
    const tokenData = await this.repository.findVerificationToken(token);
    if (!tokenData) {
      throw new InvalidVerificationTokenException();
    }

    // Check if expired
    if (new Date() > tokenData.expiresAt) {
      await this.repository.deleteVerificationToken(token);
      throw new InvalidVerificationTokenException('Verification token has expired');
    }

    // Find user
    const user = await this.repository.findUserById(tokenData.userId);
    if (!user) {
      throw new EntityNotFoundException('User', tokenData.userId);
    }

    // Check if already verified
    if (user.emailVerified) {
      await this.repository.deleteVerificationToken(token);
      throw new EmailAlreadyVerifiedException(user.email);
    }

    // Mark email as verified
    await this.repository.markEmailAsVerified(tokenData.userId);

    // Delete used token
    await this.repository.deleteVerificationToken(token);

    // Publish domain event
    const event = new EmailVerifiedEvent(tokenData.userId, user.email);
    this.eventBus.publish(event);

    return {
      success: true,
      email: user.email,
    };
  }
}

export { EMAIL_VERIFICATION_REPOSITORY, EVENT_BUS };
