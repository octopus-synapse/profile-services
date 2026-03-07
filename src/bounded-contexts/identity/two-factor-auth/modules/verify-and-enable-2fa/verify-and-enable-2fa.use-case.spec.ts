/**
 * Verify and Enable 2FA Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryTwoFactorRepository,
  StubHashService,
  StubTotpService,
} from '../../../shared-kernel/testing';
import { InvalidTotpTokenException, TwoFactorNotSetupException } from '../../domain/exceptions';
import { VerifyAndEnable2faUseCase } from './verify-and-enable-2fa.use-case';

describe('VerifyAndEnable2faUseCase', () => {
  let useCase: VerifyAndEnable2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: StubTotpService;
  let hashService: StubHashService;

  const userId = 'user-123';
  const validToken = '123456';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = StubTotpService.alwaysValid();
    hashService = StubHashService.alwaysMatch();

    // Seed 2FA setup (not enabled yet)
    repository.seedRecord({
      userId,
      secret: 'SECRET123',
      enabled: false,
      lastUsedAt: null,
    });
    repository.seedEmail(userId, 'test@example.com');

    useCase = new VerifyAndEnable2faUseCase(repository, totpService, hashService);
  });

  it('should enable 2FA and return backup codes', async () => {
    const result = await useCase.execute(userId, validToken);

    expect(result.backupCodes).toHaveLength(10);

    // Verify 2FA was enabled
    const record = repository.getRecord(userId);
    expect(record?.enabled).toBe(true);

    // Verify backup codes were created
    const codes = repository.getAllBackupCodes(userId);
    expect(codes.length).toBe(10);
  });

  it('should throw if 2FA is not setup', async () => {
    repository.clear();

    await expect(useCase.execute(userId, validToken)).rejects.toThrow(TwoFactorNotSetupException);
  });

  it('should throw if token is invalid', async () => {
    totpService.setShouldVerify(false);

    await expect(useCase.execute(userId, validToken)).rejects.toThrow(InvalidTotpTokenException);
  });

  it('should delete existing backup codes before generating new ones', async () => {
    // Pre-existing backup codes
    repository.seedBackupCodes(userId, [
      {
        id: 'old-1',
        userId,
        codeHash: 'old_hash_1',
        used: false,
        usedAt: null,
      },
      {
        id: 'old-2',
        userId,
        codeHash: 'old_hash_2',
        used: true,
        usedAt: new Date(),
      },
    ]);

    await useCase.execute(userId, validToken);

    // All codes should be new, no old codes remain
    const codes = repository.getAllBackupCodes(userId);
    expect(codes.length).toBe(10);
    expect(codes.every((c) => c.id !== 'old-1' && c.id !== 'old-2')).toBe(true);
  });
});
