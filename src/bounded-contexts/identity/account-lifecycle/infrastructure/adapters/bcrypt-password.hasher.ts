import { PasswordHasherPort } from '../../domain/ports';

const BCRYPT_COST = 12;

export class BcryptPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
