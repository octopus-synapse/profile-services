/**
 * Password Hash Service
 * Single Responsibility: Password hashing and validation using bcrypt
 *
 * This is a shared infrastructure service used by multiple Bounded Contexts:
 * - authentication (login validation)
 * - password-management (change password)
 * - account-lifecycle (delete account confirmation)
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordHashService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
