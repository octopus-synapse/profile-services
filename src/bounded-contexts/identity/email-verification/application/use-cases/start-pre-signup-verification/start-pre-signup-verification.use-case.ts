import { LoggerPort } from '@/shared-kernel';
import type { EnvConfig } from '@/shared-kernel/config';
import { hashToken } from '@/shared-kernel/crypto/token-hash';
import {
  EmailAlreadyRegisteredException,
  VerificationTokenAlreadySentException,
} from '../../../domain/exceptions';
import {
  EmailVerificationRepositoryPort,
  PreSignupVerificationStorePort,
  VerificationEmailSenderPort,
} from '../../../domain/ports';
import { EmailVerificationToken } from '../../../domain/value-objects';
import type {
  StartPreSignupVerificationCommand,
  StartPreSignupVerificationPort,
  StartPreSignupVerificationResult,
} from '../../ports';
import { RESEND_COOLDOWN_SECONDS } from '../send-verification-email/send-verification-email.use-case';

/** The code's lifetime — also the challenge's cache TTL. */
export const PRE_SIGNUP_CODE_TTL_MINUTES = 15;

export class StartPreSignupVerificationUseCase implements StartPreSignupVerificationPort {
  constructor(
    private readonly repository: EmailVerificationRepositoryPort,
    private readonly store: PreSignupVerificationStorePort,
    private readonly emailSender: VerificationEmailSenderPort,
    private readonly logger: LoggerPort,
    private readonly env: Pick<EnvConfig, 'NODE_ENV' | 'BYPASS_2FA'>,
  ) {}

  async execute(
    command: StartPreSignupVerificationCommand,
  ): Promise<StartPreSignupVerificationResult> {
    const { email } = command;

    // Identifier-first: the client only reaches this step after `identify`
    // said the e-mail is free, but the check must not be client-trusted —
    // sending a "verify your e-mail" code for an account the requester may
    // not own is a confusion/abuse vector. (Existence is already public via
    // /v1/auth/identify, so this leaks nothing new.)
    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      throw new EmailAlreadyRegisteredException(email);
    }

    const current = await this.store.find(email);
    if (current) {
      const elapsedMs = Date.now() - current.createdAtMs;
      const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
      if (remainingMs > 0) {
        throw new VerificationTokenAlreadySentException(Math.ceil(remainingMs / 1000));
      }
    }

    const token = EmailVerificationToken.generateNew(PRE_SIGNUP_CODE_TTL_MINUTES);
    await this.store.set(
      email,
      { codeHash: hashToken(token.getValue()), attempts: 0, createdAtMs: Date.now() },
      PRE_SIGNUP_CODE_TTL_MINUTES * 60,
    );

    await this.emailSender.sendVerificationEmail(email, null, token.getValue());

    const showTestCode = this.env.NODE_ENV !== 'production' && this.env.BYPASS_2FA === true;

    return {
      secondsUntilResendAllowed: RESEND_COOLDOWN_SECONDS,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      ...(showTestCode ? { testCode: token.getValue() } : {}),
    };
  }
}
