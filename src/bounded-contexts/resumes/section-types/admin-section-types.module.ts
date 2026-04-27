/**
 * Admin Section Types Module
 *
 * Thin Nest shell over `buildAdminSectionTypesUseCases`. Routes are
 * described in `admin-section-types.routes.ts` and synthesized into
 * Nest controllers at module load. The bundle
 * (`AdminSectionTypesUseCases`) is injected from this module's DI
 * scope.
 */

import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@/bounded-contexts/identity/authentication';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { adminSectionTypesRoutes } from './admin-section-types.routes';
import {
  AdminSectionTypesUseCases,
  buildAdminSectionTypesUseCases,
} from './application/admin-section-types.composition';

@Module({
  imports: [PrismaModule, AuthenticationModule, AuthorizationModule],
  controllers: synthesizeRouteControllers(AdminSectionTypesUseCases, adminSectionTypesRoutes),
  providers: [
    {
      provide: AdminSectionTypesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildAdminSectionTypesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [AdminSectionTypesUseCases],
})
export class AdminSectionTypesModule {}
