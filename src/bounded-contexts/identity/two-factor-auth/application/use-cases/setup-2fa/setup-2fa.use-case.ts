/**
 * Setup 2FA Use Case
 *
 * Generates TOTP secret and QR code for 2FA setup.
 * Does NOT enable 2FA - user must verify with valid token first.
 */

import { TwoFactorAlreadyEnabledException } from '../../../domain/exceptions';
import type { QrCodeServicePort } from '../../../domain/ports/qrcode-service.port';
import type { TotpServicePort } from '../../../domain/ports/totp-service.port';
import type { TwoFactorRepositoryPort } from '../../../domain/ports/two-factor.repository.port';

const APP_NAME = 'ProFile';

export interface Setup2faResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export class Setup2faUseCase {
  constructor(
    private readonly repository: TwoFactorRepositoryPort,
    private readonly totpService: TotpServicePort,
    private readonly qrCodeService: QrCodeServicePort,
  ) {}

  async execute(userId: string): Promise<Setup2faResult> {
    // Check if 2FA is already enabled
    const existing = await this.repository.findByUserId(userId);

    if (existing?.enabled) {
      throw new TwoFactorAlreadyEnabledException();
    }

    // Get user email for QR code label
    const email = await this.repository.getUserEmail(userId);
    const label = `${APP_NAME} (${email ?? userId})`;

    // Generate TOTP secret
    const secret = this.totpService.generateSecret(label, APP_NAME);

    // Generate QR code
    const qrCode = await this.qrCodeService.generateDataUrl(secret.otpauthUrl);

    // Save or update the 2FA record (not enabled yet)
    if (existing) {
      await this.repository.updateSecret(userId, secret.base32);
    } else {
      await this.repository.create(userId, secret.base32);
    }

    return {
      secret: secret.base32,
      qrCode,
      manualEntryKey: secret.base32,
    };
  }
}
