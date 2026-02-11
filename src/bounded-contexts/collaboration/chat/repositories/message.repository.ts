import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new message.
   */
  async create(data: { conversationId: string; senderId: string; content: string }) {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
      },
      include: {
        sender: {
          select: { id: true, displayName: true, photoURL: true },
        },
      },
    });
  }

  /**
   * Get messages for a conversation with cursor-based pagination.
   */
  async findByConversationId(conversationId: string, options: { cursor?: string; limit: number }) {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      take: options.limit + 1,
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, displayName: true, photoURL: true },
        },
      },
    });

    const hasMore = messages.length > options.limit;
    if (hasMore) messages.pop();

    // Reverse to get chronological order
    messages.reverse();

    return {
      messages,
      nextCursor: hasMore ? messages[0]?.id : null,
      hasMore,
    };
  }

  /**
   * Mark a single message as read.
   */
  async markAsRead(messageId: string, userId: string) {
    return this.prisma.message.updateMany({
      where: {
        id: messageId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread messages in a conversation as read.
   */
  async markConversationAsRead(conversationId: string, userId: string) {
    return this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread message count for a user.
   */
  async getUnreadCount(userId: string) {
    const result = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
        senderId: { not: userId },
        isRead: false,
        isDeleted: false,
      },
      _count: { id: true },
    });

    const byConversation: Record<string, number> = {};
    let totalUnread = 0;

    for (const item of result) {
      byConversation[item.conversationId] = item._count.id;
      totalUnread += item._count.id;
    }

    return { totalUnread, byConversation };
  }

  /**
   * Get unread count for a specific conversation.
   */
  async getUnreadCountByConversation(conversationId: string, userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
        isDeleted: false,
      },
    });
  }

  /**
   * Soft delete a message.
   */
  async softDelete(messageId: string, userId: string) {
    return this.prisma.message.updateMany({
      where: {
        id: messageId,
        senderId: userId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Find message by ID.
   */
  async findById(messageId: string) {
    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, displayName: true, photoURL: true },
        },
      },
    });
  }
}
