/**
 * Password Service
 * Single Responsibility: Password hashing and validation
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, APP_CONSTANTS.BCRYPT_ROUNDS);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
