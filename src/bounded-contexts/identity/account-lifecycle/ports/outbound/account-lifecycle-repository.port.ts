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

export interface AccountLifecycleRepositoryPort {
  /**
   * Finds an account by ID
   */
  findById(userId: string): Promise<AccountData | null>;

  /**
   * Finds an account by email
   */
  findByEmail(email: string): Promise<AccountData | null>;

  /**
   * Checks if email is already registered
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Creates a new account
   * @returns The created account
   */
  create(data: CreateAccountData): Promise<AccountData>;

  /**
   * Deactivates an account
   */
  deactivate(userId: string): Promise<void>;

  /**
   * Reactivates an account
   */
  reactivate(userId: string): Promise<void>;

  /**
   * Permanently deletes an account and all associated data
   */
  delete(userId: string): Promise<void>;
}
