/**
 * Create Account Port (Inbound)
 *
 * Use-case interface for account registration.
 */

export interface CreateAccountCommand {
  name?: string;
  email: string;
  password: string;
  // LGPD: explicit consent captured at signup (versions sent by client must match current TOS/Privacy versions).
  acceptedTosVersion: string;
  acceptedPrivacyVersion: string;
  // Audit trail for the consent records.
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAccountResult {
  userId: string;
  email: string;
  // Auth tokens for auto-login after signup (eliminates extra login request)
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export abstract class CreateAccountPort {
  /**
   * Creates a new user account and generates auth tokens for auto-login.
   * @throws AccountAlreadyExistsException if email is already registered
   * @throws WeakPasswordException if password doesn't meet requirements
   */
  abstract execute(command: CreateAccountCommand): Promise<CreateAccountResult>;
}
