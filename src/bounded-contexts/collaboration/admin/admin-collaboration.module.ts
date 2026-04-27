/**
 * Admin Collaboration Module
 *
 * Thin Nest shell over `buildAdminCollaborationUseCases`. Controllers
 * are synthesized from `admin-collaboration.routes.ts`. Composition
 * lives in `admin-collaboration.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { buildAdminCollaborationUseCases } from './admin-collaboration.composition';
import { adminCollaborationRoutes } from './admin-collaboration.routes';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: synthesizeRouteControllers(AdminCollaborationUseCases, adminCollaborationRoutes),
  providers: [
    {
      provide: AdminCollaborationUseCases,
      useFactory: (prisma: PrismaService) => buildAdminCollaborationUseCases(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [AdminCollaborationUseCases],
})
export class AdminCollaborationModule {}
