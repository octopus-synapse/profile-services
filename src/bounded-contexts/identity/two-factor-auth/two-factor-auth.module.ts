/**
 * Two-Factor Auth Module
 *
 * Bounded Context for TOTP-based two-factor authentication.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { Validate2faInboundPort } from './application/ports/validate-2fa.inbound-port';
// Application Use Cases
import { Disable2faUseCase } from './application/use-cases/disable-2fa';
import { Get2faStatusUseCase } from './application/use-cases/get-2fa-status';
import { RegenerateBackupCodesUseCase } from './application/use-cases/regenerate-backup-codes';
import { Setup2faUseCase } from './application/use-cases/setup-2fa';
import { Validate2faUseCase } from './application/use-cases/validate-2fa';
import { VerifyAndEnable2faUseCase } from './application/use-cases/verify-and-enable-2fa';
// Domain Ports
import {
  HashServicePort,
  QrCodeServicePort,
  TotpServicePort,
  TwoFactorRepositoryPort,
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
    { provide: TwoFactorRepositoryPort, useClass: TwoFactorRepository },
    { provide: TotpServicePort, useClass: SpeakeasyTotpAdapter },
    { provide: QrCodeServicePort, useClass: QrCodeAdapter },
    { provide: HashServicePort, useClass: BcryptHashAdapter },

    // Inbound Ports (use-cases) — wired by class as DI token (no Symbol indirection)
    {
      provide: Setup2faUseCase,
      useFactory: (repo: TwoFactorRepositoryPort, totp: TotpServicePort, qr: QrCodeServicePort) =>
        new Setup2faUseCase(repo, totp, qr),
      inject: [TwoFactorRepositoryPort, TotpServicePort, QrCodeServicePort],
    },
    {
      provide: VerifyAndEnable2faUseCase,
      useFactory: (repo: TwoFactorRepositoryPort, totp: TotpServicePort, hash: HashServicePort) =>
        new VerifyAndEnable2faUseCase(repo, totp, hash),
      inject: [TwoFactorRepositoryPort, TotpServicePort, HashServicePort],
    },
    {
      provide: Disable2faUseCase,
      useFactory: (repo: TwoFactorRepositoryPort) => new Disable2faUseCase(repo),
      inject: [TwoFactorRepositoryPort],
    },
    {
      provide: Get2faStatusUseCase,
      useFactory: (repo: TwoFactorRepositoryPort) => new Get2faStatusUseCase(repo),
      inject: [TwoFactorRepositoryPort],
    },
    {
      provide: RegenerateBackupCodesUseCase,
      useFactory: (repo: TwoFactorRepositoryPort, hash: HashServicePort) =>
        new RegenerateBackupCodesUseCase(repo, hash),
      inject: [TwoFactorRepositoryPort, HashServicePort],
    },
    {
      provide: Validate2faInboundPort,
      useFactory: (
        repo: TwoFactorRepositoryPort,
        totp: TotpServicePort,
        hash: HashServicePort,
        cache: CacheService,
      ) => new Validate2faUseCase(repo, totp, hash, cache),
      inject: [TwoFactorRepositoryPort, TotpServicePort, HashServicePort, CacheService],
    },
  ],
  exports: [TwoFactorRepositoryPort, TotpServicePort, HashServicePort, Validate2faInboundPort],
})
export class TwoFactorAuthModule {}
