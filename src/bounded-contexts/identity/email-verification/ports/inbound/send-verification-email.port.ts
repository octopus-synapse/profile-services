/**
 * Send Verification Email Port (Inbound)
 *
 * Use-case interface for sending verification email.
 */

export interface SendVerificationEmailCommand {
  userId: string;
}

export interface SendVerificationEmailPort {
  /**
   * Sends a verification email to the user.
   * @throws VerificationTokenAlreadySentException if sent too recently
   * @throws EmailAlreadyVerifiedException if email is already verified
   */
  execute(command: SendVerificationEmailCommand): Promise<void>;
}

export const SEND_VERIFICATION_EMAIL_PORT = Symbol('SendVerificationEmailPort');
