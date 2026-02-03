/**
 * Password Service
 * Single Responsibility: Password hashing and validation
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// BCRYPT_ROUNDS is backend-specific, keep local
const BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
