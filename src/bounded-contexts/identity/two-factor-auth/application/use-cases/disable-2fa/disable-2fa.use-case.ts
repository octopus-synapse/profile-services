/**
 * Disable 2FA Use Case
 *
 * Disables 2FA for a user, removing the secret and all backup codes.
 */

import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';

export class Disable2faUseCase {
  constructor(private readonly repository: TwoFactorRepositoryPort) {}

  async execute(userId: string): Promise<void> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth) {
      throw new TwoFactorNotSetupException();
    }

    // Delete backup codes first
    await this.repository.deleteBackupCodes(userId);

    // Delete 2FA record
    await this.repository.delete(userId);
  }
}
