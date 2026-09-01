import { LoggerPort } from '@/shared-kernel';
import { hashToken } from '@/shared-kernel/crypto/token-hash';
import { InvalidVerificationTokenException } from '../../../domain/exceptions';
import { PreSignupVerificationStorePort, RegistrationTokenIssuerPort } from '../../../domain/ports';
import type {
  ConfirmPreSignupVerificationCommand,
  ConfirmPreSignupVerificationPort,
  ConfirmPreSignupVerificationResult,
} from '../../ports';
import { PRE_SIGNUP_CODE_TTL_MINUTES } from '../start-pre-signup-verification/start-pre-signup-verification.use-case';

/**
 * On top of the route's IP rate limit: a challenge self-destructs after
 * this many wrong codes, so a distributed sweep can't grind one e-mail's
 * 10^6 keyspace across many IPs within the TTL.
 */
export const PRE_SIGNUP_MAX_ATTEMPTS = 5; // lint-allow-magic-number: the budget itself, named here

export class ConfirmPreSignupVerificationUseCase implements ConfirmPreSignupVerificationPort {
  constructor(
    private readonly store: PreSignupVerificationStorePort,
    private readonly tokenIssuer: RegistrationTokenIssuerPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    command: ConfirmPreSignupVerificationCommand,
  ): Promise<ConfirmPreSignupVerificationResult> {
    const { email, code } = command;

    const challenge = await this.store.find(email);
    if (!challenge) {
      throw new InvalidVerificationTokenException();
    }

    if (challenge.attempts >= PRE_SIGNUP_MAX_ATTEMPTS) {
      await this.store.delete(email);
      throw new InvalidVerificationTokenException();
    }

    if (hashToken(code) !== challenge.codeHash) {
      // Keep the original TTL horizon: the remaining window shrinks with
      // wall-clock time, never resets on a failed guess.
      const remainingSeconds = Math.max(
        1,
        Math.ceil(
          (challenge.createdAtMs + PRE_SIGNUP_CODE_TTL_MINUTES * 60 * 1000 - Date.now()) / 1000,
        ),
      );
      await this.store.set(
        email,
        { ...challenge, attempts: challenge.attempts + 1 },
        remainingSeconds,
      );
      throw new InvalidVerificationTokenException();
    }

    await this.store.delete(email);

    return { email, registrationToken: this.tokenIssuer.issue(email) };
  }
}
