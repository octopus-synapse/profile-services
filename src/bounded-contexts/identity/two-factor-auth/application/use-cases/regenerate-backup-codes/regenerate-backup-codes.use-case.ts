/**
 * Regenerate Backup Codes Use Case
 *
 * Generates new backup codes for a user, replacing existing ones.
 * Requires 2FA to be enabled.
 */

import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import type { HashServicePort } from '../../../domain/ports/hash-service.port';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';

const BACKUP_CODE_COUNT = 10;

export interface RegenerateBackupCodesResult {
  backupCodes: string[];
}

export class RegenerateBackupCodesUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly hashService: HashServicePort,
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
   * Generates a random backup code string in format XXXX-XXXX.
   */
  private generateBackupCodeString(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }
}
