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

export abstract class PasswordRepositoryPort {
  /**
   * Finds a user by email with password hash
   */
  abstract findByEmail(email: string): Promise<UserWithPassword | null>;

  /**
   * Finds a user by ID with password hash
   */
  abstract findById(userId: string): Promise<UserWithPassword | null>;

  /**
   * Updates user password by ID
   */
  abstract updatePassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Whether ANY user already owns this email (regardless of having a password).
   * Used to reject an email-change request to a taken address.
   */
  abstract emailExists(email: string): Promise<boolean>;

  /**
   * Commit an email change: set the new address and mark it verified (the
   * confirmation code was delivered to — and entered from — that address).
   */
  abstract updateEmail(userId: string, newEmail: string): Promise<void>;
}
