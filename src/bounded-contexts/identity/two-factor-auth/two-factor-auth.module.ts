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
import { VALIDATE_2FA_INBOUND_PORT } from './application/ports';
// Application Use Cases
import { Validate2faUseCase } from './application/use-cases/validate-2fa';
// Domain Ports
import {
  HASH_SERVICE_PORT,
  type HashServicePort,
  QR_CODE_SERVICE_PORT,
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
    provide: VALIDATE_2FA_INBOUND_PORT,
    useFactory: (
      repository: TwoFactorRepositoryPort,
      totpService: TotpServicePort,
      hashService: HashServicePort,
      cacheService: CacheService,
    ) => new Validate2faUseCase(repository, totpService, hashService, cacheService),
    inject: [TWO_FACTOR_REPOSITORY_PORT, TOTP_SERVICE_PORT, HASH_SERVICE_PORT, CacheService],
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
  exports: [
    TWO_FACTOR_REPOSITORY_PORT,
    TOTP_SERVICE_PORT,
    HASH_SERVICE_PORT,
    VALIDATE_2FA_INBOUND_PORT,
  ],
})
export class TwoFactorAuthModule {}
