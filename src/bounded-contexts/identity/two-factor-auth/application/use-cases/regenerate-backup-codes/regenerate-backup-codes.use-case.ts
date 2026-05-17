/**
 * Regenerate Backup Codes Use Case
 *
 * Generates new backup codes for a user, replacing existing ones.
 * Requires 2FA to be enabled.
 */

import { LoggerPort } from '@/shared-kernel';
import { secureRandomCode } from '@/shared-kernel/crypto';
import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import { HashServicePort } from '../../../domain/ports/hash-service.port';
import { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';

const BACKUP_CODE_COUNT = 10;
// P1 #1 — the previous generator drew from `Math.random()` (V8 xorshift,
// not a CSPRNG). An attacker who learned ~5 codes could derive the full
// internal state and predict the rest. We keep the user-visible format
// (`XXXX-XXXX`, 36-char alphabet) so existing UI copy still applies, but
// every char now comes from `crypto.randomInt` via `secureRandomCode`.
const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BACKUP_CODE_HALF_LEN = 4;

export interface RegenerateBackupCodesResult {
  backupCodes: string[];
}

export class RegenerateBackupCodesUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly hashService: HashServicePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string): Promise<RegenerateBackupCodesResult> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth?.enabled) {
      throw new TwoFactorNotSetupException();
    }

    // Delete existing backup codes
    await this.repository.deleteBackupCodes(userId);

    const codes: string[] = [];
    const hashPromises: Promise<string>[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCodeString();
      codes.push(code);
      hashPromises.push(this.hashService.hash(code));
    }

    const codeHashes = await Promise.all(hashPromises);

    // Store hashed codes
    await this.repository.createBackupCodes(userId, codeHashes);

    return { backupCodes: codes };
  }

  /**
   * Generates a CSPRNG-backed backup code string in format XXXX-XXXX.
   */
  private generateBackupCodeString(): string {
    const left = secureRandomCode(BACKUP_CODE_HALF_LEN, BACKUP_CODE_ALPHABET);
    const right = secureRandomCode(BACKUP_CODE_HALF_LEN, BACKUP_CODE_ALPHABET);
    return `${left}-${right}`;
  }
}
