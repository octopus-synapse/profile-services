/**
 * Get 2FA Status Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryTwoFactorRepository } from '../../../shared-kernel/testing';
import { Get2faStatusUseCase } from './get-2fa-status.use-case';

describe('Get2faStatusUseCase', () => {
  let useCase: Get2faStatusUseCase;
  let repository: InMemoryTwoFactorRepository;

  const userId = 'user-123';
  const lastUsedAt = new Date('2024-01-01');

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();

    // Seed enabled 2FA with backup codes
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: true,
      lastUsedAt,
    });

    // Seed 10 backup codes, 8 unused
    repository.seedBackupCodes(userId, [
      { id: 'bc-1', userId, codeHash: 'hash1', used: false, usedAt: null },
      { id: 'bc-2', userId, codeHash: 'hash2', used: false, usedAt: null },
      { id: 'bc-3', userId, codeHash: 'hash3', used: false, usedAt: null },
      { id: 'bc-4', userId, codeHash: 'hash4', used: false, usedAt: null },
      { id: 'bc-5', userId, codeHash: 'hash5', used: false, usedAt: null },
      { id: 'bc-6', userId, codeHash: 'hash6', used: false, usedAt: null },
      { id: 'bc-7', userId, codeHash: 'hash7', used: false, usedAt: null },
      { id: 'bc-8', userId, codeHash: 'hash8', used: false, usedAt: null },
      { id: 'bc-9', userId, codeHash: 'hash9', used: true, usedAt: new Date() },
      {
        id: 'bc-10',
        userId,
        codeHash: 'hash10',
        used: true,
        usedAt: new Date(),
      },
    ]);

    useCase = new Get2faStatusUseCase(repository);
  });

  it('should return enabled status with backup codes count', async () => {
    const result = await useCase.execute(userId);

    expect(result).toEqual({
      enabled: true,
      lastUsedAt,
      backupCodesRemaining: 8,
    });
  });

  it('should return disabled status when no 2FA record exists', async () => {
    repository.clear();

    const result = await useCase.execute(userId);

    expect(result).toEqual({
      enabled: false,
      lastUsedAt: null,
      backupCodesRemaining: 0,
    });
  });
});
