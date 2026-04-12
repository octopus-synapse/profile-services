/**
 * Two-Factor Auth Module
 *
 * Bounded Context for TOTP-based two-factor authentication.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
// Application Ports
import {
  DISABLE_2FA_PORT,
  GET_2FA_STATUS_PORT,
  REGENERATE_BACKUP_CODES_PORT,
  SETUP_2FA_PORT,
  VALIDATE_2FA_INBOUND_PORT,
  VERIFY_AND_ENABLE_2FA_PORT,
} from './application/ports';
// Application Use Cases
import { Disable2faUseCase } from './application/use-cases/disable-2fa';
import { Get2faStatusUseCase } from './application/use-cases/get-2fa-status';
import { RegenerateBackupCodesUseCase } from './application/use-cases/regenerate-backup-codes';
import { Setup2faUseCase } from './application/use-cases/setup-2fa';
import { Validate2faUseCase } from './application/use-cases/validate-2fa';
import { VerifyAndEnable2faUseCase } from './application/use-cases/verify-and-enable-2fa';
// Domain Ports
import {
  HASH_SERVICE_PORT,
  type HashServicePort,
  QR_CODE_SERVICE_PORT,
  type QrCodeServicePort,
  TOTP_SERVICE_PORT,
  type TotpServicePort,
  TWO_FACTOR_REPOSITORY_PORT,
  type TwoFactorRepositoryPort,
} from './domain/ports';

// Infrastructure Adapters
import {
  BcryptHashAdapter,
  QrCodeAdapter,
  SpeakeasyTotpAdapter,
  TwoFactorRepository,
} from './infrastructure/adapters';

// Infrastructure Controllers
import {
  Disable2faController,
  Get2faStatusController,
  RegenerateBackupCodesController,
  Setup2faController,
  VerifyAndEnable2faController,
} from './infrastructure/controllers';

@Module({
  imports: [PrismaModule],
  controllers: [
    Setup2faController,
    VerifyAndEnable2faController,
    Disable2faController,
    Get2faStatusController,
    RegenerateBackupCodesController,
  ],
  providers: [
    // Outbound Adapters
    { provide: TWO_FACTOR_REPOSITORY_PORT, useClass: TwoFactorRepository },
    { provide: TOTP_SERVICE_PORT, useClass: SpeakeasyTotpAdapter },
    { provide: QR_CODE_SERVICE_PORT, useClass: QrCodeAdapter },
    { provide: HASH_SERVICE_PORT, useClass: BcryptHashAdapter },

    // Inbound Ports (use-cases)
    {
      provide: SETUP_2FA_PORT,
      useFactory: (repo: TwoFactorRepositoryPort, totp: TotpServicePort, qr: QrCodeServicePort) =>
        new Setup2faUseCase(repo, totp, qr),
      inject: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, QR_CODE_SERVICE_PORT],
    },
    {
      provide: VERIFY_AND_ENABLE_2FA_PORT,
      useFactory: (repo: TwoFactorRepositoryPort, totp: TotpServicePort, hash: HashServicePort) =>
        new VerifyAndEnable2faUseCase(repo, totp, hash),
      inject: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, HASH_SERVICE_PORT],
    },
    {
      provide: DISABLE_2FA_PORT,
      useFactory: (repo: TwoFactorRepositoryPort) => new Disable2faUseCase(repo),
      inject: [TWO_FACTOR_REPOSITORY_PORT],
    },
    {
      provide: GET_2FA_STATUS_PORT,
      useFactory: (repo: TwoFactorRepositoryPort) => new Get2faStatusUseCase(repo),
      inject: [TWO_FACTOR_REPOSITORY_PORT],
    },
    {
      provide: REGENERATE_BACKUP_CODES_PORT,
      useFactory: (repo: TwoFactorRepositoryPort, hash: HashServicePort) =>
        new RegenerateBackupCodesUseCase(repo, hash),
      inject: [TWO_FACTOR_REPOSITORY_PORT, HASH_SERVICE_PORT],
    },
    {
      provide: VALIDATE_2FA_INBOUND_PORT,
      useFactory: (
        repo: TwoFactorRepositoryPort,
        totp: TotpServicePort,
        hash: HashServicePort,
        cache: CacheService,
      ) => new Validate2faUseCase(repo, totp, hash, cache),
      inject: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, HASH_SERVICE_PORT, CacheService],
    },
  ],
  exports: [
    TWO_FACTOR_REPOSITORY_PORT,
    TOTP_SERVICE_PORT,
    HASH_SERVICE_PORT,
    VALIDATE_2FA_INBOUND_PORT,
  ],
})
export class TwoFactorAuthModule {}
