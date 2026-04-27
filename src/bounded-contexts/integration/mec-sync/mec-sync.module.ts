/**
 * MEC Sync Module
 *
 * Thin Nest shell over `buildMecSyncUseCases`. All routes are described
 * in `mec-sync.routes.ts` and synthesized into Nest controllers at
 * module load. The internal/admin sync routes are gated by
 * `InternalAuthGuard` via the synthesizer guard registry under id
 * `internal-auth`.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { MecSyncUseCases } from './application/ports/mec-sync.port';
import { InternalAuthGuard } from './infrastructure/guards/internal-auth.guard';
import { buildMecSyncUseCases } from './mec-sync.composition';
import { mecSyncRoutes } from './mec-sync.routes';

@Module({
  imports: [PrismaModule, CacheModule, LoggerModule],
  controllers: [
    ...synthesizeRouteControllers(MecSyncUseCases, mecSyncRoutes, {
      guards: { 'internal-auth': { guard: InternalAuthGuard } },
    }),
  ],
  providers: [
    InternalAuthGuard,
    {
      provide: MecSyncUseCases,
      useFactory: (prisma: PrismaService, cache: CacheService, logger: LoggerPort) =>
        buildMecSyncUseCases(prisma, cache, logger),
      inject: [PrismaService, CacheService, LoggerPort],
    },
  ],
  exports: [MecSyncUseCases],
})
export class MecSyncModule {}
