import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventPublisher } from '@/shared-kernel';
import { MessageSentEvent } from '../../domain/events';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { BlockedUserRepository } from '../repositories/blocked-user.repository';
import type {
  SendMessage,
  GetMessagesQuery,
  GetConversationsQuery,
  ConversationResponse,
  MessageResponse,
  PaginatedMessagesResponse,
  PaginatedConversationsResponse,
} from '@octopus-synapse/profile-contracts';

type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; displayName: true; photoURL: true } };
  };
}>;

type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: {
    participant1: {
      select: { id: true; displayName: true; photoURL: true; username: true };
    };
    participant2: {
      select: { id: true; displayName: true; photoURL: true; username: true };
    };
  };
}>;

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly blockedUserRepo: BlockedUserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Send a message to a user (creates conversation if needed).
   */
  async sendMessage(
    senderId: string,
    dto: SendMessage,
  ): Promise<MessageResponse> {
    // Check if blocked
    const isBlocked = await this.blockedUserRepo.isBlockedBetween(
      senderId,
      dto.recipientId,
    );
    if (isBlocked) {
      throw new ForbiddenException('Cannot send message to this user');
    }

    // Cannot message yourself
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    // Find or create conversation
    const conversation = await this.conversationRepo.findOrCreate(
      senderId,
      dto.recipientId,
    );

    // Create message
    const message = await this.messageRepo.create({
      conversationId: conversation.id,
      senderId,
      content: dto.content,
    });

    this.eventPublisher.publish(
      new MessageSentEvent(message.id, {
        senderId,
        conversationId: conversation.id,
        content: dto.content,
      }),
    );

    // Update conversation last message
    await this.conversationRepo.updateLastMessage(conversation.id, {
      content: dto.content,
      senderId,
      timestamp: message.createdAt,
    });

    return this.mapMessageToResponse(message);
  }

  /**
   * Send a message to an existing conversation.
   */
  async sendMessageToConversation(
    senderId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageResponse> {
    // Verify participant
    const isParticipant = await this.conversationRepo.isParticipant(
      conversationId,
      senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    // Check if blocked
    const otherParticipant = await this.conversationRepo.getOtherParticipant(
      conversationId,
      senderId,
    );
    if (!otherParticipant) {
      throw new NotFoundException('Conversation not found');
    }

    const isBlocked = await this.blockedUserRepo.isBlockedBetween(
      senderId,
      otherParticipant.id,
    );
    if (isBlocked) {
      throw new ForbiddenException('Cannot send message to this user');
    }

    // Create message
    const message = await this.messageRepo.create({
      conversationId,
      senderId,
      content,
    });

    // Update conversation last message
    await this.conversationRepo.updateLastMessage(conversationId, {
      content,
      senderId,
      timestamp: message.createdAt,
    });

    return this.mapMessageToResponse(message);
  }

  /**
   * Get messages for a conversation with pagination.
   */
  async getMessages(
    userId: string,
    query: GetMessagesQuery,
  ): Promise<PaginatedMessagesResponse> {
    // Verify participant
    const isParticipant = await this.conversationRepo.isParticipant(
      query.conversationId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const result = await this.messageRepo.findByConversationId(
      query.conversationId,
      { cursor: query.cursor, limit: query.limit },
    );

    return {
      messages: result.messages.map((msg) => this.mapMessageToResponse(msg)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  /**
   * Get all conversations for a user.
   */
  async getConversations(
    userId: string,
    query: GetConversationsQuery,
  ): Promise<PaginatedConversationsResponse> {
    const result = await this.conversationRepo.findByUserId(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const conversationsWithUnread = await Promise.all(
      result.conversations.map(async (conv) => {
        const unreadCount = await this.messageRepo.getUnreadCountByConversation(
          conv.id,
          userId,
        );
        return this.mapConversationToResponse(conv, userId, unreadCount);
      }),
    );

    return {
      conversations: conversationsWithUnread,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  /**
   * Get a single conversation by ID.
   */
  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponse> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.participant1Id === userId ||
      conversation.participant2Id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const unreadCount = await this.messageRepo.getUnreadCountByConversation(
      conversationId,
      userId,
    );

    return this.mapConversationToResponse(conversation, userId, unreadCount);
  }

  /**
   * Mark all messages in a conversation as read.
   */
  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ count: number }> {
    const isParticipant = await this.conversationRepo.isParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const result = await this.messageRepo.markConversationAsRead(
      conversationId,
      userId,
    );

    return { count: result.count };
  }

  /**
   * Get unread message count for a user.
   */
  async getUnreadCount(userId: string) {
    return this.messageRepo.getUnreadCount(userId);
  }

  /**
   * Get conversation ID between two users (if exists).
   */
  async getConversationId(
    userId: string,
    otherUserId: string,
  ): Promise<string | null> {
    const conversation = await this.conversationRepo.findOrCreate(
      userId,
      otherUserId,
    );
    return conversation.id;
  }

  /**
   * Map database message to response DTO.
   */
  private mapMessageToResponse(message: MessageWithSender): MessageResponse {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName,
        photoURL: message.sender.photoURL,
      },
    };
  }

  /**
   * Map database conversation to response DTO.
   */
  private mapConversationToResponse(
    conversation: ConversationWithParticipants,
    currentUserId: string,
    unreadCount: number,
  ): ConversationResponse {
    const participant =
      conversation.participant1Id === currentUserId
        ? conversation.participant2
        : conversation.participant1;

    return {
      id: conversation.id,
      participant: {
        id: participant.id,
        displayName: participant.displayName,
        photoURL: participant.photoURL,
        username: participant.username,
      },
      lastMessage: conversation.lastMessageContent
        ? {
            content: conversation.lastMessageContent,
            senderId: conversation.lastMessageSenderId ?? '',
            createdAt:
              conversation.lastMessageAt?.toISOString() ??
              new Date().toISOString(),
            isRead: unreadCount === 0,
          }
        : null,
      unreadCount,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
