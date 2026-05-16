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
}

export abstract class AccountLifecycleRepositoryPort {
  abstract findById(userId: string): Promise<AccountData | null>;
  abstract findByEmail(email: string): Promise<AccountData | null>;
  abstract emailExists(email: string): Promise<boolean>;
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
