/**
 * Verification Email Sender Port
 *
 * Outbound port for sending verification emails.
 */

export abstract class VerificationEmailSenderPort {
  abstract sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
  ): Promise<void>;
}
