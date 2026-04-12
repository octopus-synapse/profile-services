/**
 * Regenerate Backup Codes Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import {
  DEFAULT_BACKUP_CODES,
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  InMemoryHashService,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { RegenerateBackupCodesUseCase } from './regenerate-backup-codes.use-case';

describe('RegenerateBackupCodesUseCase', () => {
  let useCase: RegenerateBackupCodesUseCase;
  let repository: InMemoryTwoFactorRepository;
  let hashService: InMemoryHashService;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    hashService = new InMemoryHashService();
    useCase = new RegenerateBackupCodesUseCase(repository, hashService);
  });

  describe('execute', () => {
    it('should throw TwoFactorNotSetupException when user has no 2FA record', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      // Act & Assert
      await expect(useCase.execute(userId)).rejects.toBeInstanceOf(TwoFactorNotSetupException);
    });

    it('should throw TwoFactorNotSetupException when 2FA exists but is not enabled', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      // Act & Assert
      await expect(useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId)).rejects.toBeInstanceOf(
        TwoFactorNotSetupException,
      );
    });

    it('should return exactly 10 backup codes', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should return codes in XXXX-XXXX format', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      for (const code of result.backupCodes) {
        expect(code).toMatch(codePattern);
      }
    });

    it('should store hashed versions of the codes in the repository', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const storedCodes = repository.getAllBackupCodes();
      expect(storedCodes).toHaveLength(10);

      for (const storedCode of storedCodes) {
        expect(storedCode.codeHash).toMatch(/^hashed:/);
        expect(storedCode.used).toBe(false);
        expect(storedCode.usedAt).toBeNull();
        expect(storedCode.userId).toBe(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);
      }

      // Verify each returned code has a corresponding hash stored
      for (const code of result.backupCodes) {
        const expectedHash = `hashed:${code}`;
        const found = storedCodes.some((sc) => sc.codeHash === expectedHash);
        expect(found).toBe(true);
      }
    });

    it('should delete existing backup codes before creating new ones', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }
      expect(repository.getAllBackupCodes()).toHaveLength(3);

      // Act
      await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const storedCodes = repository.getAllBackupCodes();
      expect(storedCodes).toHaveLength(10);

      // Verify none of the old codes remain
      const oldCodeHashes = DEFAULT_BACKUP_CODES.map((c) => c.codeHash);
      for (const storedCode of storedCodes) {
        expect(oldCodeHashes).not.toContain(storedCode.codeHash);
      }
    });

    it('should generate unique codes', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(result.backupCodes.length);
    });
  });
});
