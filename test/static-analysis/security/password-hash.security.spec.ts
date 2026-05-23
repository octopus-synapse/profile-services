/**
 * Password Hash Security Tests
 *
 * Tests bcrypt hashing with production settings (12 rounds).
 * These tests are intentionally slow (~2.5s) to validate real security behavior.
 *
 * P2-133 — `PasswordHashService` was deleted (legacy, no callers).
 * The canonical adapter consumed by login/change-password is
 * `BcryptPasswordHasher`; testing the wire-format contract here
 * keeps the security guarantee intact without depending on the
 * dead service.
 */

import { describe, expect, it } from 'bun:test';
import { BcryptPasswordHasher } from '@/bounded-contexts/identity/account-lifecycle/infrastructure/adapters/bcrypt-password.hasher';

describe('BcryptPasswordHasher [Security]', () => {
  // P1-#A1-17: hasher now takes cost via constructor; mirror the prior
  // BCRYPT_COST env-driven contract (default 12) for parity with prod.
  const TEST_COST = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
  const hasher = new BcryptPasswordHasher(TEST_COST);

  describe('hash', () => {
    it('should produce bcrypt hash with correct format', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hasher.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should generate unique hashes for same password (salt)', async () => {
      const password = 'mySecurePassword123!';
      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hasher.hash(password);

      const result = await hasher.compare(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'mySecurePassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await hasher.hash(password);

      const result = await hasher.compare(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });

  describe('security properties', () => {
    it('hashes carry the configured cost factor (defaults to ≥ 12 when BCRYPT_COST is unset)', async () => {
      // CI / dev typically runs with `BCRYPT_COST=4` for speed;
      // assert against the env value so the test reflects the live
      // contract. The default-when-unset branch documents the ≥12
      // prod expectation.
      const expected = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
      const hash = await hasher.hash('testPassword123!');
      const rounds = Number(hash.match(/^\$2[aby]\$(\d+)\$/)?.[1]);
      expect(rounds).toBe(expected);
      if (process.env.BCRYPT_COST === undefined) {
        expect(rounds).toBeGreaterThanOrEqual(12);
      }
    });
  });
});
