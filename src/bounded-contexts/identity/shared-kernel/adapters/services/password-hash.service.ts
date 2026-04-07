/**
 * Password Hash Service
 * Single Responsibility: Password hashing and validation using Bun.password
 *
 * This is a shared infrastructure service used by multiple Bounded Contexts:
 * - authentication (login validation)
 * - password-management (change password)
 * - account-lifecycle (delete account confirmation)
 */

import { Injectable } from '@nestjs/common';

const BCRYPT_COST = 12;

@Injectable()
export class PasswordHashService {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
