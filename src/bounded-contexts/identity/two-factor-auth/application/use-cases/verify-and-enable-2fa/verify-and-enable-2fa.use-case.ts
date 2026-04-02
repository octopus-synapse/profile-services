/**
 * Verify and Enable 2FA Use Case
 *
 * Verifies a TOTP token and enables 2FA for the user.
 * Generates backup codes upon successful verification.
 */

import { InvalidTotpTokenException, TwoFactorNotSetupException } from '../../../domain/exceptions';
import type { HashServicePort } from '../../../domain/ports/hash-service.port';
import type { TotpServicePort } from '../../../domain/ports/totp-service.port';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';

const BACKUP_CODE_COUNT = 10;

export interface VerifyAndEnable2faResult {
  enabled: boolean;
  backupCodes: string[];
}

export class VerifyAndEnable2faUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly totpService: TotpServicePort,
    private readonly hashService: HashServicePort,
  ) {}

  async execute(userId: string, token: string): Promise<VerifyAndEnable2faResult> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth) {
      throw new TwoFactorNotSetupException();
    }

    const isValid = this.totpService.verifyToken(twoFactorAuth.secret, token);

    if (!isValid) {
      throw new InvalidTotpTokenException();
    }

    // Enable 2FA
    await this.repository.enable(userId);

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    return { enabled: true, backupCodes };
  }

  private async generateBackupCodes(userId: string): Promise<string[]> {
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

    return codes;
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
