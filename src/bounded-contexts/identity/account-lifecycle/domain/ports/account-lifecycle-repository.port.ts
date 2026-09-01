/**
 * Account Lifecycle Repository Port
 *
 * Outbound port for account lifecycle persistence operations.
 */

export interface AccountData {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateAccountData {
  name?: string | null;
  email: string;
  passwordHash: string;
  /** Identifier-first signup: the e-mail was verified before the account existed. */
  emailVerified?: boolean;
}

/**
 * The minimal projection the identifier-first entry point needs to route
 * the user: whether the e-mail is verified (unverified accounts resume
 * the verification flow instead of hitting a password wall) and whether
 * a password exists at all (OAuth-only sign-ups have none, so the client
 * must point at the social button instead).
 */
export interface AccountIdentitySignals {
  emailVerified: boolean;
  hasPassword: boolean;
}

export abstract class AccountLifecycleRepositoryPort {
  abstract findById(userId: string): Promise<AccountData | null>;
  abstract findByEmail(email: string): Promise<AccountData | null>;
  abstract emailExists(email: string): Promise<boolean>;
  /** Identify projection — `null` when the e-mail has no account. */
  abstract findIdentitySignalsByEmail(email: string): Promise<AccountIdentitySignals | null>;
  abstract create(data: CreateAccountData): Promise<AccountData>;
  abstract deactivate(userId: string): Promise<void>;
  abstract reactivate(userId: string): Promise<void>;
  abstract delete(userId: string): Promise<void>;

  /**
   * Returns the user's bcrypt password hash, or `null` if the user doesn't
   * exist or never set a password (OAuth-only sign-up). Kept separate from
   * `findById` so the rest of the surface (which doesn't need the hash) can
   * be cached without the secret tagging along (mirrors P0-#7 split).
   */
  abstract findPasswordHashById(userId: string): Promise<string | null>;
}
