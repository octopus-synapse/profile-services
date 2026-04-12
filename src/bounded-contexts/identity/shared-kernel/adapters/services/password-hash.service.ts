/**
 * Password Hash Service
 * Single Responsibility: Password hashing and validation using Bun.password
 *
 * This is a shared infrastructure service used by multiple Bounded Contexts:
 * - authentication (login validation)
 * - password-management (change password)
 * - account-lifecycle (delete account confirmation)
 *
 * Security: Bun.password.verify uses bcrypt.compare internally,
 * which is timing-safe (constant-time comparison via the bcrypt C library).
 */

import { Injectable } from '@nestjs/common';

const BCRYPT_COST = 12;

@Injectable()
export class PasswordHashService {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  /**
   * Compare a plain-text password against a bcrypt hash.
   * Delegates to Bun.password.verify which uses bcrypt.compare under the hood,
   * providing timing-safe (constant-time) comparison to prevent timing attacks.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  /**
   * @deprecated Use comparePassword instead.
   */
  async compare(password: string, hash: string): Promise<boolean> {
    return this.comparePassword(password, hash);
  }
}
