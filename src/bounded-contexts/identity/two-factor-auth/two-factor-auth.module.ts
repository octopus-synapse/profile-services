/**
 * Two-Factor Auth Module
 *
 * Bounded Context for TOTP-based two-factor authentication.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';

// Adapters
import {
  BcryptHashAdapter,
  QrCodeAdapter,
  SpeakeasyTotpAdapter,
  TwoFactorRepository,
} from './adapters/outbound';
// Controllers
import { Disable2faController } from './modules/disable-2fa';
import { Get2faStatusController } from './modules/get-2fa-status';
import { RegenerateBackupCodesController } from './modules/regenerate-backup-codes';
import { Setup2faController } from './modules/setup-2fa';
// Use Cases
import { Validate2faUseCase } from './modules/validate-2fa';
import { VerifyAndEnable2faController } from './modules/verify-and-enable-2fa';
// Ports
import { VALIDATE_2FA_PORT } from './ports/inbound/validate-2fa.port';
import type { HashServicePort } from './ports/outbound/hash-service.port';
import { HASH_SERVICE_PORT } from './ports/outbound/hash-service.port';
import { QR_CODE_SERVICE_PORT } from './ports/outbound/qrcode-service.port';
import type { TotpServicePort } from './ports/outbound/totp-service.port';
import { TOTP_SERVICE_PORT } from './ports/outbound/totp-service.port';
import type { TwoFactorRepositoryPort } from './ports/outbound/two-factor-repository.port';
import { TWO_FACTOR_REPOSITORY_PORT } from './ports/outbound/two-factor-repository.port';

const providers = [
  // Repository
  {
    provide: TWO_FACTOR_REPOSITORY_PORT,
    useClass: TwoFactorRepository,
  },
  // Services
  {
    provide: TOTP_SERVICE_PORT,
    useClass: SpeakeasyTotpAdapter,
  },
  {
    provide: QR_CODE_SERVICE_PORT,
    useClass: QrCodeAdapter,
  },
  {
    provide: HASH_SERVICE_PORT,
    useClass: BcryptHashAdapter,
  },
  // Inbound: Validate2FA (consumed by authentication BC)
  {
    provide: VALIDATE_2FA_PORT,
    useFactory: (
      repository: TwoFactorRepositoryPort,
      totpService: TotpServicePort,
      hashService: HashServicePort,
    ) => new Validate2faUseCase(repository, totpService, hashService),
    inject: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, HASH_SERVICE_PORT],
  },
];

@Module({
  imports: [PrismaModule],
  controllers: [
    Setup2faController,
    VerifyAndEnable2faController,
    Disable2faController,
    Get2faStatusController,
    RegenerateBackupCodesController,
  ],
  providers,
  exports: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, HASH_SERVICE_PORT, VALIDATE_2FA_PORT],
})
export class TwoFactorAuthModule {}
