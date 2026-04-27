/**
 * Admin Collaboration Module
 *
 * ADR-001: chat and collaboration each get their own outbound port
 * with a Prisma adapter; the four use cases are POJOs wired via
 * useFactory.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { GetChatStatsUseCase } from './application/use-cases/get-chat-stats/get-chat-stats.use-case';
import { GetCollaborationStatsUseCase } from './application/use-cases/get-collaboration-stats/get-collaboration-stats.use-case';
import { ListChatConversationsUseCase } from './application/use-cases/list-chat-conversations/list-chat-conversations.use-case';
import { ListCollaborationsUseCase } from './application/use-cases/list-collaborations/list-collaborations.use-case';
import { AdminChatRepositoryPort } from './domain/ports/admin-chat.repository.port';
import { AdminCollaborationsRepositoryPort } from './domain/ports/admin-collaborations.repository.port';
import { PrismaAdminChatRepository } from './infrastructure/adapters/persistence/prisma-admin-chat.repository';
import { PrismaAdminCollaborationsRepository } from './infrastructure/adapters/persistence/prisma-admin-collaborations.repository';
import { AdminChatController } from './infrastructure/controllers/admin-chat.controller';
import { AdminCollaborationController } from './infrastructure/controllers/admin-collaboration.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [AdminChatController, AdminCollaborationController],
  providers: [
    {
      provide: AdminChatRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaAdminChatRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: AdminCollaborationsRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaAdminCollaborationsRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: GetCollaborationStatsUseCase,
      useFactory: (repo: AdminCollaborationsRepositoryPort) =>
        new GetCollaborationStatsUseCase(repo),
      inject: [AdminCollaborationsRepositoryPort],
    },
    {
      provide: ListCollaborationsUseCase,
      useFactory: (repo: AdminCollaborationsRepositoryPort) =>
        new ListCollaborationsUseCase(repo),
      inject: [AdminCollaborationsRepositoryPort],
    },
    {
      provide: GetChatStatsUseCase,
      useFactory: (repo: AdminChatRepositoryPort) => new GetChatStatsUseCase(repo),
      inject: [AdminChatRepositoryPort],
    },
    {
      provide: ListChatConversationsUseCase,
      useFactory: (repo: AdminChatRepositoryPort) => new ListChatConversationsUseCase(repo),
      inject: [AdminChatRepositoryPort],
    },
  ],
})
export class AdminCollaborationModule {}
