/**
 * Bcrypt Hash Adapter
 *
 * Implementation of HashServicePort using Bun.password.
 *
 * P1-072 — match the password-side cost (12). 2FA backup codes are
 * lower-entropy than full passwords (XXXX-XXXX, ~40 bits each), so
 * the same hashing budget provides comparable defense against an
 * offline attacker. Bumping from 10 → 12 quadruples the hash time
 * (each step is 2× slower). On commodity hardware that's ~250ms per
 * verification, identical to the rest of the auth surface.
 */

import { HashServicePort } from '../../../domain/ports/hash-service.port';

const BCRYPT_COST = 12;

export class BcryptHashAdapter implements HashServicePort {
  async hash(value: string): Promise<string> {
    return Bun.password.hash(value, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return Bun.password.verify(value, hash);
  }
}
