/**
 * Disable 2FA Use Case Tests
 *
 * Uses In-Memory repositories for clean, behavior-focused testing.
 * P0-#8 regression coverage: re-auth gate (password or TOTP) is mandatory.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  TwoFactorInvalidReauthException,
  TwoFactorNotSetupException,
  TwoFactorReauthRequiredException,
} from '../../../domain/exceptions';
import { UserPasswordVerifierPort } from '../../../domain/ports/user-password-verifier.port';
import {
  createBackupCodeRecord,
  createTwoFactorRecord,
  DEFAULT_BACKUP_CODES,
  DEFAULT_ENABLED_TWO_FACTOR_RECORD,
  DEFAULT_TWO_FACTOR_RECORD,
  InMemoryTwoFactorRepository,
} from '../../../testing';
import { Validate2faUseCase } from '../validate-2fa/validate-2fa.use-case';
import { Disable2faUseCase } from './disable-2fa.use-case';

// Minimal stubs so the use-case spec stays focused on the disable path —
// validate-2fa has its own spec.
class StubPasswordVerifier extends UserPasswordVerifierPort {
  constructor(private readonly ok: boolean) {
    super();
  }
  async verifyPassword(): Promise<boolean> {
    return this.ok;
  }
}

function stubValidate2fa(ok: boolean): Validate2faUseCase {
  return {
    validateToken: async () => ok,
  } as unknown as Validate2faUseCase;
}

const PASSWORD_OK_INPUT = { currentPassword: 'correct-horse-battery-staple' };
const TOTP_OK_INPUT = { totpCode: '123456' };

describe('Disable2faUseCase', () => {
  let repository: InMemoryTwoFactorRepository;

  beforeEach(() => {
    repository = new InMemoryTwoFactorRepository();
  });

  describe('execute', () => {
    it('throws TwoFactorNotSetupException when user has no 2FA record', async () => {
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(true), stubValidate2fa(true));

      await expect(useCase.execute('nonexistent-user', PASSWORD_OK_INPUT)).rejects.toBeInstanceOf(
        TwoFactorNotSetupException,
      );
    });

    it('throws TwoFactorReauthRequiredException when neither password nor TOTP provided', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(true), stubValidate2fa(true));

      await expect(useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId, {})).rejects.toBeInstanceOf(
        TwoFactorReauthRequiredException,
      );
    });

    it('throws TwoFactorInvalidReauthException when password is wrong AND no TOTP', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(false), stubValidate2fa(false));

      await expect(
        useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId, PASSWORD_OK_INPUT),
      ).rejects.toBeInstanceOf(TwoFactorInvalidReauthException);
    });

    it('throws TwoFactorInvalidReauthException when TOTP is wrong AND no password', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(false), stubValidate2fa(false));

      await expect(
        useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId, TOTP_OK_INPUT),
      ).rejects.toBeInstanceOf(TwoFactorInvalidReauthException);
    });

    it('deletes the 2FA record when password is correct', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(true), stubValidate2fa(false));

      await useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId, PASSWORD_OK_INPUT);

      expect(repository.getAllTwoFactorRecords()).toHaveLength(0);
    });

    it('deletes the 2FA record when password fails but TOTP succeeds', async () => {
      repository.seedTwoFactor(DEFAULT_TWO_FACTOR_RECORD);
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(false), stubValidate2fa(true));

      await useCase.execute(DEFAULT_TWO_FACTOR_RECORD.userId, TOTP_OK_INPUT);

      expect(repository.getAllTwoFactorRecords()).toHaveLength(0);
    });

    it('deletes all backup codes for the user when reauth succeeds', async () => {
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      for (const code of DEFAULT_BACKUP_CODES) {
        repository.seedBackupCode(code);
      }
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(true), stubValidate2fa(false));

      await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId, PASSWORD_OK_INPUT);

      expect(repository.getAllBackupCodes()).toHaveLength(0);
    });

    it('does not affect other users records when disabling', async () => {
      repository.seedTwoFactor(DEFAULT_ENABLED_TWO_FACTOR_RECORD);
      const otherUserRecord = createTwoFactorRecord({ userId: 'other-user', enabled: true });
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
      const useCase = new Disable2faUseCase(repository, new StubPasswordVerifier(true), stubValidate2fa(false));

      await useCase.execute(DEFAULT_ENABLED_TWO_FACTOR_RECORD.userId, PASSWORD_OK_INPUT);

      const records = repository.getAllTwoFactorRecords();
      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe('other-user');

      const backupCodes = repository.getAllBackupCodes();
      expect(backupCodes).toHaveLength(1);
      expect(backupCodes[0].userId).toBe('other-user');
    });

    // Touch the logger import so it's not flagged unused if specs evolve.
    it('logger stub is callable', () => {
      stubLogger.log('ok', 'spec');
    });
  });
});
