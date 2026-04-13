import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate } from '@/shared-kernel/database';

@Injectable()
export class AdminChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalConversations, totalMessages, activeConversations, activeChatUsersRaw] =
      await Promise.all([
        this.prisma.conversation.count(),
        this.prisma.message.count({ where: { isDeleted: false } }),
        this.prisma.conversation.count({ where: { lastMessageAt: { gte: thirtyDaysAgo } } }),
        this.prisma.message.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
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

  async getConversations(query: { page?: number; pageSize?: number }) {
    return paginate(this.prisma.conversation, {
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
