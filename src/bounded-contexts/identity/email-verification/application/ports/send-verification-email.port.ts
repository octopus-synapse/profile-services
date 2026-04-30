/**
 * Send Verification Email Port (Inbound)
 *
 * Use-case interface for sending verification email.
 */

export interface SendVerificationEmailCommand {
  userId: string;
}

export interface ResendCooldown {
  /** Seconds the user must wait before the next resend is allowed (0 when ready). */
  secondsUntilResendAllowed: number;
  /** Total cooldown window the backend enforces between sends. */
  cooldownSeconds: number;
}

export abstract class SendVerificationEmailPort {
  /**
   * Sends a verification email to the user.
   * @throws VerificationTokenAlreadySentException if sent too recently
   * @throws EmailAlreadyVerifiedException if email is already verified
   */
  abstract execute(command: SendVerificationEmailCommand): Promise<ResendCooldown>;
}
