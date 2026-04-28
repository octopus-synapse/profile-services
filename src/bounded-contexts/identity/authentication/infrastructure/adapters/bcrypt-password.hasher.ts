import { PasswordHasherPort } from '../../domain/ports';

export class BcryptPasswordHasher implements PasswordHasherPort {
  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
