/**
 * Verify Email Port (Inbound)
 *
 * Use-case interface for verifying email with token.
 */

export interface VerifyEmailCommand {
  token: string;
}

export interface VerifyEmailResult {
  success: true;
  email: string;
}

export interface VerifyEmailPort {
  /**
   * Verifies user email using a valid verification token.
   * @throws InvalidVerificationTokenException if token is invalid or expired
   * @throws EmailAlreadyVerifiedException if email is already verified
   */
  execute(command: VerifyEmailCommand): Promise<VerifyEmailResult>;
}

export const VERIFY_EMAIL_PORT = Symbol('VerifyEmailPort');
