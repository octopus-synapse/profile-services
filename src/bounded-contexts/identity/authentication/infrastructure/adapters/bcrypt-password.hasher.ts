import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { PasswordHasherPort } from '../../domain/ports';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
