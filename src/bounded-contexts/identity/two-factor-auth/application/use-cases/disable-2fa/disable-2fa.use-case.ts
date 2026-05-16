/**
 * Disable 2FA Use Case
 *
 * Disables 2FA for a user, removing the secret and all backup codes.
 *
 * P0-#8: requires explicit re-authentication via either the current password
 * OR a valid TOTP code. Without this, a stolen session cookie (XSS, session
 * fixation) is sufficient to strip the second factor — the very protection
 * 2FA exists to provide.
 */

import { TwoFactorNotSetupException } from '../../../domain/exceptions';
import { TwoFactorInvalidReauthException } from '../../../domain/exceptions/two-factor-invalid-reauth.exception';
import { TwoFactorReauthRequiredException } from '../../../domain/exceptions/two-factor-reauth-required.exception';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';
import type { UserPasswordVerifierPort } from '../../../domain/ports/user-password-verifier.port';
import type { Validate2faUseCase } from '../validate-2fa/validate-2fa.use-case';

export interface Disable2faInput {
  readonly currentPassword?: string;
  readonly totpCode?: string;
}

export class Disable2faUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly passwords: UserPasswordVerifierPort,
    private readonly validate2fa: Validate2faUseCase,
  ) {}

  async execute(userId: string, input: Disable2faInput): Promise<void> {
    const twoFactorAuth = await this.repository.findByUserId(userId);

    if (!twoFactorAuth) {
      throw new TwoFactorNotSetupException();
    }

    // Require at least one proof of credential ownership. Either suffices —
    // matching the industry-standard "either password OR TOTP" pattern for
    // step-down reauth.
    const { currentPassword, totpCode } = input;
    if (!currentPassword && !totpCode) {
      throw new TwoFactorReauthRequiredException();
    }

    let reauthOk = false;
    if (currentPassword) {
      reauthOk = await this.passwords.verifyPassword(userId, currentPassword);
    }
    if (!reauthOk && totpCode) {
      reauthOk = await this.validate2fa.validateToken(userId, totpCode);
    }
    if (!reauthOk) {
      throw new TwoFactorInvalidReauthException();
    }

    // Delete backup codes first
    await this.repository.deleteBackupCodes(userId);

    // Delete 2FA record
    await this.repository.delete(userId);
  }
}
