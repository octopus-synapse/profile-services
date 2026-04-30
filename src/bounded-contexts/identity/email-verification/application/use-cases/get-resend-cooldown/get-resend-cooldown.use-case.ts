import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { EmailVerificationRepositoryPort } from '../../../domain/ports';
import type { GetResendCooldownQuery, ResendCooldown } from '../../ports';
import { GetResendCooldownPort } from '../../ports';
import { RESEND_COOLDOWN_SECONDS } from '../send-verification-email/send-verification-email.use-case';

export class GetResendCooldownUseCase implements GetResendCooldownPort {
  constructor(private readonly repository: EmailVerificationRepositoryPort) {}

  async execute(query: GetResendCooldownQuery): Promise<ResendCooldown> {
    const { userId } = query;

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    const lastCreatedAt = await this.repository.getLastTokenCreatedAt(userId);
    if (!lastCreatedAt) {
      return { secondsUntilResendAllowed: 0, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
    }

    const elapsedMs = Date.now() - lastCreatedAt.getTime();
    const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
    const secondsUntilResendAllowed = remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;

    return { secondsUntilResendAllowed, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
  }
}
