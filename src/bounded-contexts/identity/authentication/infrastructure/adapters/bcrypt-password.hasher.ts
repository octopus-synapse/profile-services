import { Injectable } from '@nestjs/common';
import { PasswordHasherPort } from '../../domain/ports';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
