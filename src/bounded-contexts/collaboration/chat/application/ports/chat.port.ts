/**
 * Chat Port
 *
 * Defines domain types and repository abstraction for chat operations.
 */

import type { Prisma } from '@prisma/client';
import type {
  ConversationResponse,
  GetConversationsQuery,
  GetMessagesQuery,
  MessageResponse,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  SendMessage,
} from '../../schemas/chat.schema';

// ============================================================================
// Domain Types
// ============================================================================

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; displayName: true; photoURL: true } };
  };
}>;

export type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: {
    participant1: {
      select: { id: true; displayName: true; photoURL: true; username: true };
    };
    participant2: {
      select: { id: true; displayName: true; photoURL: true; username: true };
    };
  };
}>;

// ============================================================================
// Repository Ports (Abstractions)
// ============================================================================

export abstract class ConversationRepositoryPort {
  abstract findOrCreate(userId1: string, userId2: string): Promise<ConversationWithParticipants>;
  abstract findById(conversationId: string): Promise<ConversationWithParticipants | null>;
  abstract findByUserId(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    conversations: ConversationWithParticipants[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  abstract updateLastMessage(
    conversationId: string,
    data: { content: string; senderId: string; timestamp: Date },
  ): Promise<unknown>;
  abstract isParticipant(conversationId: string, userId: string): Promise<boolean>;
  abstract getOtherParticipant(
    conversationId: string,
    userId: string,
  ): Promise<{ id: string; displayName: string | null; photoURL: string | null; username: string | null } | null>;
}

export abstract class MessageRepositoryPort {
  abstract create(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<MessageWithSender>;
  abstract findByConversationId(
    conversationId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    messages: MessageWithSender[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  abstract markConversationAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ count: number }>;
  abstract getUnreadCount(userId: string): Promise<{
    totalUnread: number;
    byConversation: Record<string, number>;
  }>;
  abstract getUnreadCountByConversation(
    conversationId: string,
    userId: string,
  ): Promise<number>;
}

export abstract class BlockedUserRepositoryPort {
  abstract isBlockedBetween(userId1: string, userId2: string): Promise<boolean>;
}

export abstract class ChatCachePort {
  abstract invalidateUnread(userId: string): Promise<void>;
  abstract invalidateConversations(userId: string): Promise<void>;
  abstract getUnreadCount<T extends { totalUnread: number; byConversation: Record<string, number> }>(
    userId: string,
    computeFn: () => Promise<T>,
  ): Promise<T>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const CHAT_USE_CASES = Symbol('CHAT_USE_CASES');

export interface ChatUseCases {
  sendMessageUseCase: {
    execute: (senderId: string, dto: SendMessage) => Promise<MessageResponse>;
  };
  sendMessageToConversationUseCase: {
    execute: (senderId: string, conversationId: string, content: string) => Promise<MessageResponse>;
  };
  getMessagesUseCase: {
    execute: (userId: string, query: GetMessagesQuery) => Promise<PaginatedMessagesResponse>;
  };
  getConversationsUseCase: {
    execute: (
      userId: string,
      query: GetConversationsQuery,
    ) => Promise<PaginatedConversationsResponse>;
  };
  getConversationUseCase: {
    execute: (userId: string, conversationId: string) => Promise<ConversationResponse>;
  };
  markConversationReadUseCase: {
    execute: (userId: string, conversationId: string) => Promise<{ count: number }>;
  };
  getUnreadCountUseCase: {
    execute: (userId: string) => Promise<{
      totalUnread: number;
      byConversation: Record<string, number>;
    }>;
  };
  getConversationIdUseCase: {
    execute: (userId: string, otherUserId: string) => Promise<string | null>;
  };
}
