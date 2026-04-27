/**
 * Two-Factor Auth Module
 *
 * Thin Nest shell over `buildTwoFactorAuthUseCases`. All wiring lives in
 * `two-factor-auth.composition.ts`. The `Validate2faInboundPort` is
 * re-exposed as a separate provider bound to `bundle.validate2fa` so
 * cross-BC consumers (authentication) can keep depending on the
 * inbound port without learning about the bundle.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { TwoFactorAuthUseCases } from './application/ports/two-factor-auth.port';
import { Validate2faInboundPort } from './application/ports/validate-2fa.inbound-port';
import {
  Disable2faController,
  Get2faStatusController,
  RegenerateBackupCodesController,
  Setup2faController,
  VerifyAndEnable2faController,
} from './infrastructure/controllers';
import { buildTwoFactorAuthUseCases } from './two-factor-auth.composition';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [
    Setup2faController,
    VerifyAndEnable2faController,
    Disable2faController,
    Get2faStatusController,
    RegenerateBackupCodesController,
  ],
  providers: [
    {
      provide: TwoFactorAuthUseCases,
      useFactory: (prisma: PrismaService, cache: CacheService, logger: LoggerPort) =>
        buildTwoFactorAuthUseCases(prisma, cache, logger),
      inject: [PrismaService, CacheService, LoggerPort],
    },
    {
      provide: Validate2faInboundPort,
      useFactory: (bc: TwoFactorAuthUseCases) => bc.validate2fa,
      inject: [TwoFactorAuthUseCases],
    },
  ],
  exports: [TwoFactorAuthUseCases, Validate2faInboundPort],
})
export class TwoFactorAuthModule {}
