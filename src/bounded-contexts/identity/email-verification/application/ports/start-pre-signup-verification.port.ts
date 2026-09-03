import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
/**
 * Start Pre-Signup Verification Port (Inbound)
 *
 * Identifier-first flow, step 2 entry: sends a 6-digit code to an e-mail
 * that has no account yet, storing only the code's hash (pre-account, so
 * outside `EmailVerificationToken`). Mirrors the authenticated `send`
 * use-case's cooldown/testCode contract so the client renders both with
 * the same component.
 */

export interface StartPreSignupVerificationCommand {
  email: string;
  /** The request's language — the code e-mail is written in it (no account to ask yet). */
  locale?: Locale;
}

export interface StartPreSignupVerificationResult {
  secondsUntilResendAllowed: number;
  cooldownSeconds: number;
  /** Non-production only (BYPASS_2FA): the issued code. */
  testCode?: string;
}

export abstract class StartPreSignupVerificationPort {
  /**
   * @throws EmailAlreadyRegisteredException when the e-mail has an account
   * @throws VerificationTokenAlreadySentException within the resend cooldown
   */
  abstract execute(
    command: StartPreSignupVerificationCommand,
  ): Promise<StartPreSignupVerificationResult>;
}
