import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find or create a conversation between two users.
   * Ensures participant1Id < participant2Id for consistent ordering.
   */
  async findOrCreate(userId1: string, userId2: string) {
    const [participant1Id, participant2Id] = [userId1, userId2].sort();

    const existing = await this.prisma.conversation.findUnique({
      where: {
        participant1Id_participant2Id: { participant1Id, participant2Id },
      },
      include: {
        participant1: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
        participant2: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { participant1Id, participant2Id },
      include: {
        participant1: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
        participant2: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get a conversation by ID with participant info.
   */
  async findById(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
        participant2: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get all conversations for a user with pagination.
   */
  async findByUserId(
    userId: string,
    options: { cursor?: string; limit: number },
  ) {
    const where: Prisma.ConversationWhereInput = {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      take: options.limit + 1,
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: {
        participant1: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
        participant2: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
            username: true,
          },
        },
      },
    });

    const hasMore = conversations.length > options.limit;
    if (hasMore) conversations.pop();

    return {
      conversations,
      nextCursor: hasMore ? conversations[conversations.length - 1]?.id : null,
      hasMore,
    };
  }

  /**
   * Update last message metadata for a conversation.
   */
  async updateLastMessage(
    conversationId: string,
    data: { content: string; senderId: string; timestamp: Date },
  ) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageContent: data.content.substring(0, 100),
        lastMessageAt: data.timestamp,
        lastMessageSenderId: data.senderId,
      },
    });
  }

  /**
   * Check if user is participant in conversation.
   */
  async isParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });
    return !!conversation;
  }

  /**
   * Get the other participant in a conversation.
   */
  async getOtherParticipant(conversationId: string, userId: string) {
    const conversation = await this.findById(conversationId);
    if (!conversation) return null;

    return conversation.participant1Id === userId
      ? conversation.participant2
      : conversation.participant1;
  }
}
