/**
 * Confirm Pre-Signup Verification Port (Inbound)
 *
 * Identifier-first flow, step 2 exit: checks the typed 6-digit code
 * against the stored challenge and, on success, issues the stateless
 * registration token `POST /v1/accounts` accepts as proof that the
 * e-mail was verified before the account existed.
 */

export interface ConfirmPreSignupVerificationCommand {
  email: string;
  code: string;
}

export interface ConfirmPreSignupVerificationResult {
  email: string;
  /** HMAC-signed continuation token — send as `emailVerificationToken` on signup. */
  registrationToken: string;
}

export abstract class ConfirmPreSignupVerificationPort {
  /**
   * @throws InvalidVerificationTokenException on wrong/expired code or
   *         after too many failed attempts (the challenge is destroyed).
   */
  abstract execute(
    command: ConfirmPreSignupVerificationCommand,
  ): Promise<ConfirmPreSignupVerificationResult>;
}
