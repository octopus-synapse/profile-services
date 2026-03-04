/**
 * Setup 2FA Use Case Tests
 *
 * Uses In-Memory repositories and Stubs for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryTwoFactorRepository,
  StubQrCodeService,
  StubTotpService,
} from '../../../shared-kernel/testing';
import { TwoFactorAlreadyEnabledException } from '../../domain/exceptions';
import { Setup2faUseCase } from './setup-2fa.use-case';

describe('Setup2faUseCase', () => {
  let useCase: Setup2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: StubTotpService;
  let qrCodeService: StubQrCodeService;

  const userId = 'user-123';
  const email = 'test@example.com';

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = new StubTotpService();
    qrCodeService = new StubQrCodeService();

    // Configure defaults
    repository.seedEmail(userId, email);
    totpService.setGeneratedSecret(
      'SECRET123',
      'otpauth://totp/ProFile?secret=SECRET123',
    );
    qrCodeService.setDataUrl('data:image/png;base64,QRCODE');

    useCase = new Setup2faUseCase(repository, totpService, qrCodeService);
  });

  it('should generate secret and QR code for new user', async () => {
    const result = await useCase.execute(userId);

    expect(result.secret).toBe('SECRET123');
    expect(result.qrCode).toBe('data:image/png;base64,QRCODE');
    expect(result.manualEntryKey).toBe('SECRET123');

    // Verify record was created
    const record = repository.getRecord(userId);
    expect(record).toBeDefined();
    expect(record?.secret).toBe('SECRET123');
    expect(record?.enabled).toBe(false);
  });

  it('should update secret for user with existing setup', async () => {
    // Pre-existing setup (not enabled)
    repository.seedRecord({
      userId,
      secret: 'OLD_SECRET',
      enabled: false,
      lastUsedAt: null,
    });

    const result = await useCase.execute(userId);

    expect(result.secret).toBe('SECRET123');

    // Verify secret was updated
    const record = repository.getRecord(userId);
    expect(record?.secret).toBe('SECRET123');
  });

  it('should throw if 2FA is already enabled', async () => {
    repository.seedRecord({
      userId,
      secret: 'SECRET',
      enabled: true,
      lastUsedAt: null,
    });

    await expect(useCase.execute(userId)).rejects.toThrow(
      TwoFactorAlreadyEnabledException,
    );
  });
});
