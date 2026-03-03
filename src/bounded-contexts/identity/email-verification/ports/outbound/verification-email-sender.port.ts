/**
 * Verification Email Sender Port
 *
 * Outbound port for sending verification emails.
 */

export interface VerificationEmailSenderPort {
  /**
   * Sends a verification email
   */
  sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
  ): Promise<void>;
}
