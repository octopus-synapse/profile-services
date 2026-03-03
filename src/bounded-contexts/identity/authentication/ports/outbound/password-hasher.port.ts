/**
 * Password Hasher Port
 */

export interface PasswordHasherPort {
  /**
   * Compares a password with its hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}
