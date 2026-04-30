import { PasswordHasherPort } from '../../domain/ports';

// Default cost 12 matches OWASP guidance for bcrypt. Tests override
// via `BCRYPT_COST=4` (≈6ms vs ≈80ms at cost 12) — same algorithm,
// just fewer rounds, which is fine because test fixtures throw the
// hashes away after a few seconds.
const BCRYPT_COST = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);

export class BcryptPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
