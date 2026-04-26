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

export abstract class VerifyEmailPort {
  /**
   * Verifies user email using a valid verification token.
   * @throws InvalidVerificationTokenException if token is invalid or expired
   * @throws EmailAlreadyVerifiedException if email is already verified
   */
  abstract execute(command: VerifyEmailCommand): Promise<VerifyEmailResult>;
}
