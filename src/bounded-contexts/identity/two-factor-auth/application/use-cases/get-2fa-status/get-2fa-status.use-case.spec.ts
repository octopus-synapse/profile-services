/**
 * Get 2FA Status Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createBackupCodeRecord,
  DEFAULT_BACKUP_CODES,
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { Get2faStatusUseCase } from './get-2fa-status.use-case';

describe('Get2faStatusUseCase', () => {
  let useCase: Get2faStatusUseCase;
  let repository: InMemoryTwoFactorRepository;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    useCase = new Get2faStatusUseCase(repository);
  });

  describe('execute', () => {
    it('should return disabled status with no backup codes when user has no 2FA record', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      // Act
      const result = await useCase.execute(userId);

      // Assert
      expect(result.enabled).toBe(false);
      expect(result.lastUsedAt).toBeNull();
      expect(result.backupCodesRemaining).toBe(0);
    });

    it('should return disabled status when 2FA record exists but is not enabled', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId);

      // Assert
      expect(result.enabled).toBe(false);
      expect(result.lastUsedAt).toBeNull();
      expect(result.backupCodesRemaining).toBe(0);
    });

    it('should return enabled status with lastUsedAt when 2FA is enabled', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      expect(result.enabled).toBe(true);
      expect(result.lastUsedAt).toEqual(new Date('2024-01-01'));
      expect(result.backupCodesRemaining).toBe(0);
    });

    it('should return correct count of unused backup codes', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }

      // Act
      const result = await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId);

      // Assert
      expect(result.enabled).toBe(true);
      expect(result.backupCodesRemaining).toBe(3);
    });

    it('should exclude used backup codes from the count', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }
      repository.seedBackupCode(
        createBackupCodeRecord({
          id: 'backup-used',
          userId: 'user-1',
          codeHash: 'hashed:USED-CODE',
          used: true,
          usedAt: new Date(),
        }),
      );

      // Act
      const result = await useCase.execute('user-1');

      // Assert
      expect(result.backupCodesRemaining).toBe(3);
    });

    it('should not count backup codes belonging to other users', async () => {
      // Arrange
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      repository.seedBackupCode(
        createBackupCodeRecord({
          id: 'backup-other',
          userId: 'other-user',
          codeHash: 'hashed:OTHER-CODE',
        }),
      );

      // Act
      const result = await useCase.execute('user-1');

      // Assert
      expect(result.backupCodesRemaining).toBe(0);
    });
  });
});
