/**
 * Password Hasher Port
 *
 * Outbound port for password hashing operations.
 * Implemented by crypto adapters (bcrypt, argon2, etc).
 */

export interface PasswordHasherPort {
  /**
   * Hashes a plain text password
   */
  hash(password: string): Promise<string>;

  /**
   * Compares a plain text password with a hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER_PORT = Symbol('PasswordHasherPort');
