/**
 * Prisma adapter for `AdminChatRepositoryPort`. The stats query fans
 * out to four parallel reads; the list query goes through the shared
 * `paginate` helper so pagination stays consistent across the admin
 * surfaces.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate } from '@/shared-kernel/database';
import {
  type AdminChatConversationView,
  AdminChatRepositoryPort,
  type AdminChatStats,
  type ListConversationsQuery,
} from '../../../domain/ports/admin-chat.repository.port';

export class PrismaAdminChatRepository extends AdminChatRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getStats(activeSince: Date): Promise<AdminChatStats> {
    const [totalConversations, totalMessages, activeConversations, activeChatUsersRaw] =
      await Promise.all([
        this.prisma.conversation.count(),
        this.prisma.message.count({ where: { isDeleted: false } }),
        this.prisma.conversation.count({ where: { lastMessageAt: { gte: activeSince } } }),
        this.prisma.message.findMany({
          where: { createdAt: { gte: activeSince } },
          select: { senderId: true },
          distinct: ['senderId'],
        }),
      ]);

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      activeChatUsers: activeChatUsersRaw.length,
    };
  }

  async listConversations(query: ListConversationsQuery) {
    return paginate<AdminChatConversationView>(this.prisma.conversation, {
      page: query.page,
      pageSize: query.pageSize,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participant1: { select: { id: true, name: true, email: true } },
        participant2: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
