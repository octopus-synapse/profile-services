/**
 * Get 2FA Status Use Case
 *
 * Gets the 2FA status for a user including enabled state,
 * last used timestamp, and remaining backup codes.
 */

import type { TwoFactorRepositoryPort } from '../../ports/outbound/two-factor-repository.port';

export interface TwoFactorStatus {
  enabled: boolean;
  lastUsedAt: Date | null;
  backupCodesRemaining: number;
}

export class Get2faStatusUseCase {
  constructor(private readonly repository: TwoFactorRepositoryPort) {}

  async execute(userId: string): Promise<TwoFactorStatus> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth) {
      return {
        enabled: false,
        lastUsedAt: null,
        backupCodesRemaining: 0,
      };
    }

    const backupCodesRemaining = await this.repository.countUnusedBackupCodes(userId);

    return {
      enabled: twoFactorAuth.enabled,
      lastUsedAt: twoFactorAuth.lastUsedAt,
      backupCodesRemaining,
    };
  }
}
