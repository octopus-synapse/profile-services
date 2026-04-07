/**
 * Verify and Enable 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InvalidTotpTokenException, TwoFactorNotSetupException } from '../../../domain/exceptions';
import {
  DEFAULT_TWO_FACTOR_RECORD,
  DEFAULT_USER,
  InMemoryHashService,
  InMemoryTotpService,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { VerifyAndEnable2faUseCase } from './verify-and-enable-2fa.use-case';

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('VerifyAndEnable2faUseCase', () => {
  let useCase: VerifyAndEnable2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: InMemoryTotpService;
  let hashService: InMemoryHashService;

  const userId = DEFAULT_USER.id;
  const validToken = '123456';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = new InMemoryTotpService();
    hashService = new InMemoryHashService();

    // Seed a 2FA record that is not yet enabled (setup completed)
    repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

    useCase = new VerifyAndEnable2faUseCase(repository, totpService, hashService);
  });

  // ───────────────────────────────────────────────────────────────
  // execute()
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should enable 2FA and return backup codes on valid token', async () => {
      const result = await useCase.execute(userId, validToken);

      expect(result.enabled).toBe(true);
      expect(result.backupCodes).toHaveLength(10);

      // Each backup code should be in XXXX-XXXX format
      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      }
    });

    it('should mark the 2FA record as enabled in the repository', async () => {
      await useCase.execute(userId, validToken);

      const record = await repository.findByUserId(userId);
      expect(record).not.toBeNull();
      expect(record!.enabled).toBe(true);
    });

    it('should store hashed backup codes in the repository', async () => {
      await useCase.execute(userId, validToken);

      const backupCodes = repository.getAllBackupCodes();
      expect(backupCodes).toHaveLength(10);

      for (const code of backupCodes) {
        expect(code.userId).toBe(userId);
        expect(code.codeHash).toContain('hashed:');
        expect(code.used).toBe(false);
        expect(code.usedAt).toBeNull();
      }
    });

    it('should delete existing backup codes before generating new ones', async () => {
      // First enable
      await useCase.execute(userId, validToken);
      expect(repository.getAllBackupCodes()).toHaveLength(10);

      // Reset 2FA to not enabled so we can run again
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      // Second enable should replace backup codes
      await useCase.execute(userId, validToken);
      expect(repository.getAllBackupCodes()).toHaveLength(10);
    });

    it('should throw TwoFactorNotSetupException when no 2FA record exists', async () => {
      repository.clear();

      expect(useCase.execute(userId, validToken)).rejects.toThrow(TwoFactorNotSetupException);
    });

    it('should throw InvalidTotpTokenException when token is invalid', async () => {
      totpService.setInvalidAllTokens(DEFAULT_TWO_FACTOR_RECORD.secret);

      expect(useCase.execute(userId, '999999')).rejects.toThrow(InvalidTotpTokenException);
    });

    it('should not enable 2FA when token is invalid', async () => {
      totpService.setInvalidAllTokens(DEFAULT_TWO_FACTOR_RECORD.secret);

      try {
        await useCase.execute(userId, '999999');
      } catch {
        // Expected
      }

      const record = await repository.findByUserId(userId);
      expect(record!.enabled).toBe(false);
    });

    it('should generate unique backup codes', async () => {
      const result = await useCase.execute(userId, validToken);

      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(result.backupCodes.length);
    });
  });
});
