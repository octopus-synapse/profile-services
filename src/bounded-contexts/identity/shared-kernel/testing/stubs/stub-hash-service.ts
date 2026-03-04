/**
 * Stub Hash Service
 *
 * Test double for hash operations (backup codes).
 * Implements predictable hashing for test verification.
 */

import type { HashServicePort } from '../../../two-factor-auth/ports/outbound/hash-service.port';

export class StubHashService implements HashServicePort {
  private hashPrefix = 'hashed_';
  private shouldMatch = true;

  async hash(value: string): Promise<string> {
    return `${this.hashPrefix}${value}`;
  }

  async compare(value: string, hash: string): Promise<boolean> {
    if (!this.shouldMatch) {
      return false;
    }
    return hash === `${this.hashPrefix}${value}`;
  }

  // Test helpers
  setHashPrefix(prefix: string): void {
    this.hashPrefix = prefix;
  }

  setShouldMatch(value: boolean): void {
    this.shouldMatch = value;
  }

  static alwaysMatch(): StubHashService {
    const service = new StubHashService();
    service.setShouldMatch(true);
    return service;
  }

  static neverMatch(): StubHashService {
    const service = new StubHashService();
    service.setShouldMatch(false);
    return service;
  }
}
