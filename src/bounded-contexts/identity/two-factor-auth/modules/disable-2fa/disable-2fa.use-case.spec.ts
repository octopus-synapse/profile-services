/**
 * Disable 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryTwoFactorRepository } from '../../../shared-kernel/testing';
import { TwoFactorNotSetupException } from '../../domain/exceptions';
import { Disable2faUseCase } from './disable-2fa.use-case';

describe('Disable2faUseCase', () => {
  let useCase: Disable2faUseCase;
  let repository: InMemoryTwoFactorRepository;

  const userId = 'user-123';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();

    // Seed enabled 2FA with backup codes
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: true,
      lastUsedAt: null,
    });
    repository.seedBackupCodes(userId, [
      { id: 'bc-1', userId, codeHash: 'hash1', used: false, usedAt: null },
      { id: 'bc-2', userId, codeHash: 'hash2', used: false, usedAt: null },
    ]);

    useCase = new Disable2faUseCase(repository);
  });

  it('should delete backup codes and 2FA record', async () => {
    await useCase.execute(userId);

    // Verify 2FA record was deleted
    const record = repository.getRecord(userId);
    expect(record).toBeUndefined();

    // Verify backup codes were deleted
    const codes = repository.getAllBackupCodes(userId);
    expect(codes).toHaveLength(0);
  });

  it('should throw if 2FA is not setup', async () => {
    repository.clear();

    await expect(useCase.execute(userId)).rejects.toThrow(TwoFactorNotSetupException);
  });
});
