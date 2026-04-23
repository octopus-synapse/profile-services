import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../../shared-kernel/exceptions';
import type { EmailVerificationRepositoryPort } from '../../../domain/ports';
import type { GetResendCooldownPort, GetResendCooldownQuery, ResendCooldown } from '../../ports';
import { RESEND_COOLDOWN_SECONDS } from '../send-verification-email/send-verification-email.use-case';

const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepositoryPort');

@Injectable()
export class GetResendCooldownUseCase implements GetResendCooldownPort {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly repository: EmailVerificationRepositoryPort,
  ) {}

  async execute(query: GetResendCooldownQuery): Promise<ResendCooldown> {
    const { userId } = query;

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    const lastCreatedAt = await this.repository.getLastTokenCreatedAt(userId);
    if (!lastCreatedAt) {
      return {
        secondsUntilResendAllowed: 0,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    }

    const elapsedMs = Date.now() - lastCreatedAt.getTime();
    const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
    const secondsUntilResendAllowed = remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;

    return {
      secondsUntilResendAllowed,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }
}
