/**
 * Admin Collaboration Module
 *
 * Thin Nest shell over `buildAdminCollaborationUseCases`. All wiring
 * lives in `admin-collaboration.composition.ts`.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';
import { buildAdminCollaborationUseCases } from './admin-collaboration.composition';
import { AdminChatController } from './infrastructure/controllers/admin-chat.controller';
import { AdminCollaborationController } from './infrastructure/controllers/admin-collaboration.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [AdminChatController, AdminCollaborationController],
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
