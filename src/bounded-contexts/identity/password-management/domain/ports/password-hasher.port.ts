/**
 * Password Hasher Port
 *
 * Outbound port for password hashing operations.
 * Implemented by crypto adapters (bcrypt, argon2, etc).
 */

export abstract class PasswordHasherPort {
  /**
   * Hashes a plain text password
   */
  abstract hash(password: string): Promise<string>;

  /**
   * Compares a plain text password with a hash
   */
  abstract compare(password: string, hash: string): Promise<boolean>;
}
