/**
 * Validate 2FA Use Case
 *
 * Validates a TOTP token or backup code for login.
 * This is an internal use case (no controller) - used by authentication BC.
 */

import type { HashServicePort } from '../../ports/outbound/hash-service.port';
import type { TotpServicePort } from '../../ports/outbound/totp-service.port';
import type { TwoFactorRepositoryPort } from '../../ports/outbound/two-factor-repository.port';

export interface Validate2faResult {
  valid: boolean;
  method: 'totp' | 'backup_code' | null;
}

export class Validate2faUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly totpService: TotpServicePort,
    private readonly hashService: HashServicePort,
  ) {}

  /**
   * Validates TOTP token for a user.
   */
  async validateToken(userId: string, token: string): Promise<boolean> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth?.enabled) {
      return false;
    }

    const isValid = this.totpService.verifyToken(twoFactorAuth.secret, token);

    if (isValid) {
      await this.repository.updateLastUsed(userId);
    }

    return isValid;
  }

  /**
   * Validates backup code for a user.
   * Marks the code as used if valid.
   */
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const backupCodes = await this.repository.findUnusedBackupCodes(userId);

    if (backupCodes.length === 0) {
      return false;
    }

    for (const backupCode of backupCodes) {
      const isValid = await this.hashService.compare(code, backupCode.codeHash);

      if (isValid) {
        await this.repository.markBackupCodeUsed(backupCode.id);
        return true;
      }
    }

    return false;
  }

  /**
   * Validates either TOTP token or backup code.
   */
  async validate(userId: string, code: string): Promise<Validate2faResult> {
    // Try TOTP first (more common)
    if (await this.validateToken(userId, code)) {
      return { valid: true, method: 'totp' };
    }

    // Try backup code
    if (await this.validateBackupCode(userId, code)) {
      return { valid: true, method: 'backup_code' };
    }

    return { valid: false, method: null };
  }

  /**
   * Checks if 2FA is enabled for a user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.repository.findByUserId(userId);
    return twoFactorAuth?.enabled ?? false;
  }
}
