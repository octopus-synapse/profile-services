/**
 * Password Repository Port
 *
 * Outbound port for password-related persistence operations.
 * Implemented by adapters in the persistence layer.
 */

export interface UserWithPassword {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export interface UserBasic {
  id: string;
  email: string;
  name: string | null;
}

export interface PasswordRepositoryPort {
  /**
   * Finds a user by email with password hash
   */
  findByEmail(email: string): Promise<UserWithPassword | null>;

  /**
   * Finds a user by ID with password hash
   */
  findById(userId: string): Promise<UserWithPassword | null>;

  /**
   * Updates user password by ID
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
