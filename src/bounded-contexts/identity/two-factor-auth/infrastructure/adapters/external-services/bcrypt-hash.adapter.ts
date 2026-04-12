/**
 * Bcrypt Hash Adapter
 *
 * Implementation of HashServicePort using Bun.password.
 */

import { Injectable } from '@nestjs/common';
import type { HashServicePort } from '../../../domain/ports/hash-service.port';

const BCRYPT_COST = 10;

@Injectable()
export class BcryptHashAdapter implements HashServicePort {
  async hash(value: string): Promise<string> {
    return Bun.password.hash(value, { algorithm: 'bcrypt', cost: BCRYPT_COST });
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return Bun.password.verify(value, hash);
  }
}
