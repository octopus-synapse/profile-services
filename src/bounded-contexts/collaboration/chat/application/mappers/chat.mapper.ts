/**
 * Chat Mappers
 *
 * Pure functions converting domain types to response DTOs.
 * Single source of truth — used by all chat use-cases.
 */

import type {
  BlockedUserResponse,
  ConversationResponse,
  MessageResponse,
} from '../../schemas/chat.schema';
import type { BlockedUserWithDetails } from '../ports/block.port';
import type { ConversationWithParticipants, MessageWithSender } from '../ports/chat.port';

export function mapMessageToResponse(message: MessageWithSender): MessageResponse {
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
      name: message.sender.name,
      photoURL: message.sender.photoURL,
    },
  };
}

export function mapConversationToResponse(
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
      name: participant.name,
      photoURL: participant.photoURL,
      username: participant.username,
    },
    lastMessage: conversation.lastMessageContent
      ? {
          content: conversation.lastMessageContent,
          senderId: conversation.lastMessageSenderId ?? '',
          createdAt: conversation.lastMessageAt?.toISOString() ?? new Date().toISOString(),
          isRead: unreadCount === 0,
        }
      : null,
    unreadCount,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function mapBlockedUserToResponse(record: BlockedUserWithDetails): BlockedUserResponse {
  return {
    id: record.id,
    blockedAt: record.createdAt.toISOString(),
    reason: record.reason,
    user: {
      id: record.blocked.id,
      name: record.blocked.name,
      photoURL: record.blocked.photoURL,
      username: record.blocked.username,
    },
  };
}
