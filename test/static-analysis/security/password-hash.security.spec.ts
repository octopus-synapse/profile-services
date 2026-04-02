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
    it('should use sufficient cost factor (timing check)', async () => {
      const password = 'testPassword123!';

      const start = performance.now();
      await service.hash(password);
      const duration = performance.now() - start;

      // With 12 rounds, hashing should take at least 100ms
      // This ensures we're not accidentally using weak settings
      expect(duration).toBeGreaterThan(100);
    });
  });
});
