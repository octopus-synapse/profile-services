/**
 * Badges Module
 *
 * Thin Nest shell over `buildBadgesUseCases`. The route descriptors
 * (`badges.routes.ts`) are synthesized into Nest controllers at module
 * load by `synthesizeRouteControllers`, which produces classes that
 * inject `BadgesUseCases` from this module's DI scope.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { BadgesUseCases } from './application/ports/badges.port';
import { buildBadgesUseCases } from './badges.composition';
import { badgesRoutes } from './badges.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(BadgesUseCases, badgesRoutes),
  providers: [
    {
      provide: BadgesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildBadgesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [BadgesUseCases],
})
export class BadgesModule {}
