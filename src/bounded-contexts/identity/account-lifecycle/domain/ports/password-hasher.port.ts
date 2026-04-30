/**
 * Password Hasher Port
 *
 * Outbound port for password hashing operations.
 */

export abstract class PasswordHasherPort {
  abstract hash(password: string): Promise<string>;
  abstract compare(password: string, hash: string): Promise<boolean>;
}
