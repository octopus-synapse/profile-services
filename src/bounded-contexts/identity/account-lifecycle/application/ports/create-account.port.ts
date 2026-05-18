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
}

export abstract class CreateAccountPort {
  /**
   * Creates a new user account. The session cookie (httpOnly) is established
   * by the route handler via `createSession.execute`. Auth tokens are NOT
   * returned in the response body — exposing them to JS would defeat the
   * httpOnly cookie defense against XSS exfiltration (P2 hardening).
   * @throws AccountAlreadyExistsException if email is already registered
   * @throws WeakPasswordException if password doesn't meet requirements
   */
  abstract execute(command: CreateAccountCommand): Promise<CreateAccountResult>;
}
