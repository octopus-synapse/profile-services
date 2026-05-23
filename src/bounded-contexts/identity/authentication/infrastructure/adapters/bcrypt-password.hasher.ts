import { PasswordHasherPort } from '../../domain/ports';

// P1-#A1-17: signature accepts the validated `cost` for parity with the
// account-lifecycle / password-management hashers. The authentication BC
// only uses `compare`, so the value is currently unused here — keeping
// the signature uniform avoids drift the next time a hash() path is
// added (e.g. JIT password upgrade on login).
export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(_cost: number) {}

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
