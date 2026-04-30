/**
 * Password Hasher Port (authentication-side)
 *
 * Authentication only needs to compare passwords, not hash them.
 */

export abstract class PasswordHasherPort {
  abstract compare(password: string, hash: string): Promise<boolean>;
}
