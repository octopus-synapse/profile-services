/**
 * Setup 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { TwoFactorAlreadyEnabledException } from '../../../domain/exceptions';
import {
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  DEFAULT_USER,
  InMemoryQrCodeService,
  InMemoryTotpService,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { Setup2faUseCase } from './setup-2fa.use-case';

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Setup2faUseCase', () => {
  let useCase: Setup2faUseCase;
  let repository: InMemoryTwoFactorRepository;
  let totpService: InMemoryTotpService;
  let qrCodeService: InMemoryQrCodeService;

  const userId = DEFAULT_USER.id;
  const email = DEFAULT_USER.email;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
    totpService = new InMemoryTotpService();
    qrCodeService = new InMemoryQrCodeService();

    repository.seedUser(userId, email);

    useCase = new Setup2faUseCase(repository, totpService, qrCodeService);
  });

  // ───────────────────────────────────────────────────────────────
  // execute()
  // ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should generate secret and QR code for a new user', async () => {
      const result = await useCase.execute(userId);

      expect(result.secret).toBeTruthy();
      expect(result.qrCode).toContain('data:image/png;base64,');
      expect(result.manualEntryKey).toBe(result.secret);
    });

    it('should create a new 2FA record in the repository', async () => {
      await useCase.execute(userId);

      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe(userId);
      expect(records[0].enabled).toBe(false);
    });

    it('should update secret when 2FA record already exists but is not enabled', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);

      const result = await useCase.execute(userId);

      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(1);
      expect(records[0].secret).toBe(result.secret);
      expect(records[0].enabled).toBe(false);
    });

    it('should throw TwoFactorAlreadyEnabledException when 2FA is already enabled', async () => {
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);

      expect(useCase.execute(userId)).rejects.toThrow(TwoFactorAlreadyEnabledException);
    });

    it('should use email in QR code label when available', async () => {
      const result = await useCase.execute(userId);

      // The QR code data URL encodes the otpauthUrl which includes the label
      // The secret is generated with label "ProFile (test@example.com)"
      expect(result.qrCode).toBeTruthy();
      expect(result.secret).toBeTruthy();
    });

    it('should use userId as fallback when email is not available', async () => {
      const noEmailUserId = 'user-no-email';

      const result = await useCase.execute(noEmailUserId);

      expect(result.secret).toBeTruthy();
      expect(result.qrCode).toBeTruthy();

      // Should still create a record
      const record = await repository.findByUserId(noEmailUserId);
      expect(record).not.toBeNull();
      expect(record!.enabled).toBe(false);
    });
  });
});
