/**
 * Validate 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  DEFAULT_USER,
  InMemoryCacheService,
  InMemoryHashService,
  InMemoryTotpService,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { Validate2faUseCase } from './validate-2fa.use-case';

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Validate2faUseCase', () => {
  let useCase: Validate2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: InMemoryTotpService;
  let hashService: InMemoryHashService;
  let cacheService: InMemoryCacheService;

  const userId = DEFAULT_USER.id;
  const validToken = '123456';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = new InMemoryTotpService();
    hashService = new InMemoryHashService();
    cacheService = new InMemoryCacheService();

    // Seed an enabled 2FA record
    repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

    useCase = new Validate2faUseCase(repository, totpService, hashService, cacheService);
  });

  // ───────────────────────────────────────────────────────────────
  // validateToken()
  // ───────────────────────────────────────────────────────────────

  describe('validateToken', () => {
    it('should return true for a valid TOTP token', async () => {
      const result = await useCase.validateToken(userId, validToken);

      expect(result).toBe(true);
    });

    it('should update lastUsed timestamp on valid token', async () => {
      await useCase.validateToken(userId, validToken);

      const record = await repository.findByUserId(userId);
      expect(record!.lastUsedAt).not.toBeNull();
    });

    it('should return false for an invalid TOTP token', async () => {
      totpService.setInvalidAllTokens(DEFAULT_ENABLED_TWO_FACTOR_RECORD.secret);

      const result = await useCase.validateToken(userId, '999999');

      expect(result).toBe(false);
    });

    it('should return false when 2FA is not enabled', async () => {
      repository.clear();
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD); // not enabled

      const result = await useCase.validateToken(userId, validToken);

      expect(result).toBe(false);
    });

    it('should return false when no 2FA record exists', async () => {
      repository.clear();

      const result = await useCase.validateToken(userId, validToken);

      expect(result).toBe(false);
    });

    it('should prevent replay attacks by rejecting a reused token', async () => {
      const first = await useCase.validateToken(userId, validToken);
      expect(first).toBe(true);

      const second = await useCase.validateToken(userId, validToken);
      expect(second).toBe(false);
    });

    it('should allow different tokens for the same user', async () => {
      const first = await useCase.validateToken(userId, '123456');
      expect(first).toBe(true);

      const second = await useCase.validateToken(userId, '000000');
      expect(second).toBe(true);
    });

    it('should skip replay check gracefully when cache is not provided', async () => {
      const useCaseNoCache = new Validate2faUseCase(repository, totpService, hashService);

      const first = await useCaseNoCache.validateToken(userId, validToken);
      expect(first).toBe(true);

      // Without cache, replay prevention is skipped (graceful degradation)
      const second = await useCaseNoCache.validateToken(userId, validToken);
      expect(second).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // validateBackupCode()
  // ───────────────────────────────────────────────────────────────

  describe('validateBackupCode', () => {
    beforeEach(() => {
      repository.seedBackupCode({ id: 'backup-1', userId, codeHash: 'hashed:ABCD-1234', used: false, usedAt: null });
      repository.seedBackupCode({ id: 'backup-2', userId, codeHash: 'hashed:EFGH-5678', used: false, usedAt: null });
      repository.seedBackupCode({ id: 'backup-3', userId, codeHash: 'hashed:IJKL-9012', used: false, usedAt: null });
    });

    it('should return true for a valid unused backup code', async () => {
      const result = await useCase.validateBackupCode(userId, 'ABCD-1234');

      expect(result).toBe(true);
    });

    it('should consume the backup code so it cannot be reused', async () => {
      await useCase.validateBackupCode(userId, 'ABCD-1234');

      const second = await useCase.validateBackupCode(userId, 'ABCD-1234');
      expect(second).toBe(false);
    });

    it('should return false for an invalid backup code', async () => {
      const result = await useCase.validateBackupCode(userId, 'XXXX-9999');

      expect(result).toBe(false);
    });

    it('should return false when no backup codes exist', async () => {
      repository.clear();
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      const result = await useCase.validateBackupCode(userId, 'ABCD-1234');

      expect(result).toBe(false);
    });

    it('should allow using different backup codes sequentially', async () => {
      const first = await useCase.validateBackupCode(userId, 'ABCD-1234');
      const second = await useCase.validateBackupCode(userId, 'EFGH-5678');

      expect(first).toBe(true);
      expect(second).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // validate()
  // ───────────────────────────────────────────────────────────────

  describe('validate', () => {
    beforeEach(() => {
      repository.seedBackupCode({ id: 'backup-1', userId, codeHash: 'hashed:ABCD-1234', used: false, usedAt: null });
      repository.seedBackupCode({ id: 'backup-2', userId, codeHash: 'hashed:EFGH-5678', used: false, usedAt: null });
      repository.seedBackupCode({ id: 'backup-3', userId, codeHash: 'hashed:IJKL-9012', used: false, usedAt: null });
    });

    it('should return valid with method totp for a valid TOTP token', async () => {
      const result = await useCase.validate(userId, validToken);

      expect(result.valid).toBe(true);
      expect(result.method).toBe('totp');
    });

    it('should return valid with method backup_code for a valid backup code', async () => {
      // Use a token that is invalid for TOTP but valid as a backup code
      totpService.setInvalidAllTokens(DEFAULT_ENABLED_TWO_FACTOR_RECORD.secret);

      const result = await useCase.validate(userId, 'ABCD-1234');

      expect(result.valid).toBe(true);
      expect(result.method).toBe('backup_code');
    });

    it('should return invalid when both TOTP and backup code fail', async () => {
      totpService.setInvalidAllTokens(DEFAULT_ENABLED_TWO_FACTOR_RECORD.secret);

      const result = await useCase.validate(userId, 'INVALID-CODE');

      expect(result.valid).toBe(false);
      expect(result.method).toBeNull();
    });

    it('should try TOTP first before backup code', async () => {
      // "123456" is valid as TOTP by default, so it should match as totp
      const result = await useCase.validate(userId, validToken);

      expect(result.method).toBe('totp');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // isEnabled()
  // ───────────────────────────────────────────────────────────────

  describe('isEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const result = await useCase.isEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is not enabled', async () => {
      repository.clear();
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD); // enabled: false

      const result = await useCase.isEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return false when no 2FA record exists', async () => {
      repository.clear();

      const result = await useCase.isEnabled(userId);

      expect(result).toBe(false);
    });
  });
});
