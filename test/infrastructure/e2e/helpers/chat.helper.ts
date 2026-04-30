/**
 * E2E Test Chat Helper
 *
 * Provides chat-specific utilities for E2E tests:
 * - Permission setup
 * - Conversation creation
 * - Message sending utilities
 */

import type { PrismaClient } from '@prisma/client';

export class ChatHelper {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Ensure user has chat:use permission
   * Creates the permission if it doesn't exist and assigns to user
   */
  async grantChatPermission(userId: string): Promise<void> {
    // First, ensure the permission exists
    let permission = await this.prisma.permission.findUnique({
      where: {
        resource_action: { resource: 'chat', action: 'use' },
      },
    });

    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { resource: 'chat', action: 'use', description: 'Use chat features', isSystem: true },
      });
    }

    // Per-user grants now live in AccessModifier (effect=GRANT,
    // type=GRANT_PERMISSION). Use deleteMany+create to keep the helper
    // idempotent without relying on a composite unique key.
    await this.prisma.accessModifier.deleteMany({
      where: {
        userId,
        modifierType: 'GRANT_PERMISSION',
        permissionId: permission.id,
      },
    });
    await this.prisma.accessModifier.create({
      data: {
        userId,
        modifierType: 'GRANT_PERMISSION',
        effect: 'GRANT',
        permissionId: permission.id,
        reason: 'e2e test setup: grant chat:use',
        createdBy: userId,
      },
    });
  }

  /**
   * Clean up chat data for a user
   */
  async cleanupUserChatData(userId: string): Promise<void> {
    // Delete messages where user is sender
    await this.prisma.message.deleteMany({
      where: { senderId: userId },
    });

    // Delete blocked users (both directions)
    await this.prisma.blockedUser.deleteMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });

    // Delete conversations where user is participant
    await this.prisma.conversation.deleteMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });
  }

  /**
   * Clean up conversations between two users
   */
  async cleanupConversationBetween(user1Id: string, user2Id: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: user1Id, participant2Id: user2Id },
          { participant1Id: user2Id, participant2Id: user1Id },
        ],
      },
    });

    if (conversation) {
      await this.prisma.message.deleteMany({
        where: { conversationId: conversation.id },
      });

      await this.prisma.conversation.delete({
        where: { id: conversation.id },
      });
    }
  }

  /**
   * Get conversation between two users (if exists)
   */
  async getConversation(user1Id: string, user2Id: string) {
    return this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: user1Id, participant2Id: user2Id },
          { participant1Id: user2Id, participant2Id: user1Id },
        ],
      },
    });
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        senderId: { not: userId },
        isRead: false,
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    });
  }
}
