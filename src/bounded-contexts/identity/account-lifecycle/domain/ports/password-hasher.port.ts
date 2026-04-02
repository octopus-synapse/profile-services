/**
 * Password Hasher Port
 *
 * Outbound port for password hashing operations.
 */

export interface PasswordHasherPort {
  /**
   * Hashes a password
   */
  hash(password: string): Promise<string>;

  /**
   * Compares a password with its hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}
