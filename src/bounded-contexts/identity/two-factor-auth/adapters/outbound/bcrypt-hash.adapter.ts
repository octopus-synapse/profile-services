/**
 * Bcrypt Hash Adapter
 *
 * Implementation of HashServicePort using bcrypt library.
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { HashServicePort } from '../../ports/outbound/hash-service.port';

const SALT_ROUNDS = 10;

@Injectable()
export class BcryptHashAdapter implements HashServicePort {
  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, SALT_ROUNDS);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
