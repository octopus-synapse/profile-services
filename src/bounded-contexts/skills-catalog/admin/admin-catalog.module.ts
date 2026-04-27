/**
 * Admin Catalog Module
 *
 * Thin Nest shell over `buildAdminCatalogUseCases`. Routes are
 * described in `admin-catalog.routes.ts` and synthesized into Nest
 * controllers at module load. The bundle (`AdminCatalogUseCases`) is
 * injected from this module's DI scope.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { AdminCatalogUseCases } from './application/ports/admin-catalog.port';
import { buildAdminCatalogUseCases } from './admin-catalog.composition';
import { adminCatalogRoutes } from './admin-catalog.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(AdminCatalogUseCases, adminCatalogRoutes),
  providers: [
    {
      provide: AdminCatalogUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildAdminCatalogUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [AdminCatalogUseCases],
})
export class AdminCatalogModule {}
