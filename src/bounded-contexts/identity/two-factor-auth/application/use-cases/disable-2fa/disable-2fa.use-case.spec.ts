/**
 * Disable 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import {
  DEFAULT_BACKUP_CODES,
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  InMemoryTwoFactorRepository,
  createBackupCodeRecord,
  createTwoFactorRecord,
} from '../../../testing';
import { Disable2faUseCase } from './disable-2fa.use-case';

describe('Disable2faUseCase', () => {
  let useCase: Disable2faUseCase;
  let repository: InMemoryTwoFactorRepository;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    useCase = new Disable2faUseCase(repository);
  });

  describe('execute', () => {
    it('should throw TwoFactorNotSetupException when user has no 2FA record', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      // Act & Assert
      await expect(useCase.execute(userId)).rejects.toBeInstanceOf(TwoFactorNotSetupException);
    });

    it('should delete the 2FA record for the user', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      // Act
      await useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId);

      // Assert
      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(0);
    });

    it('should delete all backup codes for the user', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }

      // Act
      await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const backupCodes = repository.getAllBackupCodes();
      expect(backupCodes).toHaveLength(0);
    });

    it('should not affect other users records when disabling', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      const otherUserRecord = createTwoFactorRecord({
        userId: 'other-user',
        enabled: true,
      });
      repository.seedTwoFactor(otherUserRecord);
      repository.seedBackupCode(
        createBackupCodeRecord({
          id: 'backup-other',
          userId: 'other-user',
          codeHash: 'hashed:OTHER-CODE',
        }),
      );
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }

      // Act
      await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe('other-user');

      const backupCodes = repository.getAllBackupCodes();
      expect(backupCodes).toHaveLength(1);
      expect(backupCodes[0].userId).toBe('other-user');
    });

    it('should succeed even when user has no backup codes', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      // Act
      await useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId);

      // Assert
      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(0);
    });
  });
});
