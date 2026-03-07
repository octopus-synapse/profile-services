/**
 * Regenerate Backup Codes Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryTwoFactorRepository, StubHashService } from '../../../shared-kernel/testing';
import { TwoFactorNotSetupException } from '../../domain/exceptions';
import { RegenerateBackupCodesUseCase } from './regenerate-backup-codes.use-case';

describe('RegenerateBackupCodesUseCase', () => {
  let useCase: RegenerateBackupCodesUseCase;
  let repository: InMemoryTwoFactorRepository;
  let hashService: StubHashService;

  const userId = 'user-123';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    hashService = new StubHashService();

    // Seed enabled 2FA with existing backup codes
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: true,
      lastUsedAt: null,
    });
    repository.seedBackupCodes(userId, [
      { id: 'old-1', userId, codeHash: 'old_hash', used: false, usedAt: null },
    ]);

    useCase = new RegenerateBackupCodesUseCase(repository, hashService);
  });

  it('should generate 10 new backup codes', async () => {
    const result = await useCase.execute(userId);

    expect(result.backupCodes).toHaveLength(10);

    // Verify old codes were deleted and new ones created
    const codes = repository.getAllBackupCodes(userId);
    expect(codes.length).toBe(10);
    expect(codes.some((c) => c.id === 'old-1')).toBe(false);
  });

  it('should generate codes in XXXX-XXXX format', async () => {
    const result = await useCase.execute(userId);

    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it('should throw if 2FA is not enabled', async () => {
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: false,
      lastUsedAt: null,
    });

    await expect(useCase.execute(userId)).rejects.toThrow(TwoFactorNotSetupException);
  });

  it('should throw if 2FA record does not exist', async () => {
    repository.clear();

    await expect(useCase.execute(userId)).rejects.toThrow(TwoFactorNotSetupException);
  });
});
