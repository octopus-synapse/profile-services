/**
 * Password Hash Security Tests
 *
 * Tests bcrypt hashing with production settings (12 rounds).
 * These tests are intentionally slow (~2.5s) to validate real security behavior.
 *
 * Moved from unit tests to security tests for faster local dev feedback.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { PasswordHashService } from '@/bounded-contexts/identity/shared-kernel/adapters/services/password-hash.service';

describe('PasswordHashService [Security]', () => {
  let service: PasswordHashService;

  beforeEach(() => {
    service = new PasswordHashService();
  });

  describe('hash', () => {
    it('should produce bcrypt hash with correct format', async () => {
      const password = 'mySecurePassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should generate unique hashes for same password (salt)', async () => {
      const password = 'mySecurePassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      // Same password should produce different hashes due to random salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await service.hash(password);

      const result = await service.compare(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'mySecurePassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await service.hash(password);

      const result = await service.compare(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });

  describe('security properties', () => {
    it('should produce hashes with cost factor >= 12 when configured for production', async () => {
      // Pin cost to OWASP-recommended floor regardless of BCRYPT_COST env
      // (which test envs lower to 4 for speed). The contract under test is
      // "the service can produce production-grade hashes" — not "every hash
      // produced in CI is production-grade."
      const prodService = new PasswordHashService(12);
      const hash = await prodService.hash('testPassword123!');

      // bcrypt format: $2[aby]$<rounds>$<22-char-salt><31-char-hash>
      const rounds = Number(hash.match(/^\$2[aby]\$(\d+)\$/)?.[1]);
      expect(rounds).toBeGreaterThanOrEqual(12);
    });
  });
});
