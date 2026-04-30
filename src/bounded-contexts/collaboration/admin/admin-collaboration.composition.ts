/**
 * Pure-TS wiring for the admin-collaboration BC. Zero `@nestjs/*`
 * imports. Two slices share this composition: chat (stats + list
 * conversations) and collaborations (stats + list collaborations).
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';
import { GetChatStatsUseCase } from './application/use-cases/get-chat-stats/get-chat-stats.use-case';
import { GetCollaborationStatsUseCase } from './application/use-cases/get-collaboration-stats/get-collaboration-stats.use-case';
import { ListChatConversationsUseCase } from './application/use-cases/list-chat-conversations/list-chat-conversations.use-case';
import { ListCollaborationsUseCase } from './application/use-cases/list-collaborations/list-collaborations.use-case';
import { PrismaAdminChatRepository } from './infrastructure/adapters/persistence/prisma-admin-chat.repository';
import { PrismaAdminCollaborationsRepository } from './infrastructure/adapters/persistence/prisma-admin-collaborations.repository';

export { AdminCollaborationUseCases };

export function buildAdminCollaborationUseCases(prisma: PrismaService): AdminCollaborationUseCases {
  const chatRepo = new PrismaAdminChatRepository(prisma);
  const collabRepo = new PrismaAdminCollaborationsRepository(prisma);

  return {
    getChatStats: new GetChatStatsUseCase(chatRepo),
    listChatConversations: new ListChatConversationsUseCase(chatRepo),
    getCollaborationStats: new GetCollaborationStatsUseCase(collabRepo),
    listCollaborations: new ListCollaborationsUseCase(collabRepo),
  };
}
