/**
 * Two-Factor Auth Module
 *
 * Thin Nest shell over `buildTwoFactorAuthUseCases`. The HTTP surface
 * is described as `Route` descriptors in `two-factor-auth.routes.ts`
 * and synthesized into Nest controllers at module load by
 * `synthesizeRouteControllers`. The `Validate2faInboundPort` is
 * re-exposed as a separate provider bound to `bundle.validate2fa` so
 * cross-BC consumers (authentication) can keep depending on the
 * inbound port without learning about the bundle.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { TwoFactorAuthUseCases } from './application/ports/two-factor-auth.port';
import { Validate2faInboundPort } from './application/ports/validate-2fa.inbound-port';
import { buildTwoFactorAuthUseCases } from './two-factor-auth.composition';
import { twoFactorAuthRoutes } from './two-factor-auth.routes';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: synthesizeRouteControllers(TwoFactorAuthUseCases, twoFactorAuthRoutes),
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
