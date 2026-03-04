/**
 * Validate 2FA Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryTwoFactorRepository,
  StubHashService,
  StubTotpService,
} from '../../../shared-kernel/testing';
import { Validate2faUseCase } from './validate-2fa.use-case';

describe('Validate2faUseCase', () => {
  let useCase: Validate2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: StubTotpService;
  let hashService: StubHashService;

  const userId = 'user-123';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = StubTotpService.alwaysValid();
    hashService = StubHashService.neverMatch(); // Default: backup codes don't match

    // Seed enabled 2FA
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: true,
      lastUsedAt: null,
    });

    // Seed backup codes
    repository.seedBackupCodes(userId, [
      {
        id: 'bc-1',
        userId,
        codeHash: 'hashed_ABCD-1234',
        used: false,
        usedAt: null,
      },
    ]);

    useCase = new Validate2faUseCase(repository, totpService, hashService);
  });

  describe('validateToken', () => {
    it('should return true for valid TOTP token', async () => {
      const result = await useCase.validateToken(userId, '123456');

      expect(result).toBe(true);

      // Verify lastUsedAt was updated
      const record = repository.getRecord(userId);
      expect(record?.lastUsedAt).not.toBeNull();
    });

    it('should return false if 2FA is not enabled', async () => {
      repository.seedRecord({
        userId,
        secret: 'SECRET123',
        enabled: false,
        lastUsedAt: null,
      });

      const result = await useCase.validateToken(userId, '123456');

      expect(result).toBe(false);
    });

    it('should return false for invalid token', async () => {
      totpService.setShouldVerify(false);

      const result = await useCase.validateToken(userId, '000000');

      expect(result).toBe(false);
    });
  });

  describe('validateBackupCode', () => {
    it('should return true and mark code as used for valid backup code', async () => {
      hashService.setShouldMatch(true);

      const result = await useCase.validateBackupCode(userId, 'ABCD-1234');

      expect(result).toBe(true);

      // Verify backup code was marked as used
      const codes = repository.getAllBackupCodes(userId);
      const usedCode = codes.find((c) => c.id === 'bc-1');
      expect(usedCode?.used).toBe(true);
    });

    it('should return false if no unused backup codes', async () => {
      repository.seedBackupCodes(userId, []); // No backup codes

      const result = await useCase.validateBackupCode(userId, 'ABCD-1234');

      expect(result).toBe(false);
    });

    it('should return false for invalid backup code', async () => {
      // hashService defaults to neverMatch
      const result = await useCase.validateBackupCode(userId, 'INVALID');

      expect(result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return totp method when TOTP is valid', async () => {
      const result = await useCase.validate(userId, '123456');

      expect(result).toEqual({ valid: true, method: 'totp' });
    });

    it('should fall back to backup code when TOTP fails', async () => {
      totpService.setShouldVerify(false);
      hashService.setShouldMatch(true);

      const result = await useCase.validate(userId, 'ABCD-1234');

      expect(result).toEqual({ valid: true, method: 'backup_code' });
    });

    it('should return invalid when both methods fail', async () => {
      totpService.setShouldVerify(false);
      // hashService already defaults to neverMatch

      const result = await useCase.validate(userId, 'INVALID');

      expect(result).toEqual({ valid: false, method: null });
    });
  });

  describe('isEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const result = await useCase.isEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false when no 2FA record exists', async () => {
      repository.clear();

      const result = await useCase.isEnabled(userId);

      expect(result).toBe(false);
    });
  });
});
