import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConversationResponse } from '../../../schemas/chat.schema';
import type {
  ConversationRepositoryPort,
  ConversationWithParticipants,
  MessageRepositoryPort,
} from '../../ports/chat.port';

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
  ) {}

  async execute(userId: string, conversationId: string): Promise<ConversationResponse> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.participant1Id === userId || conversation.participant2Id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const unreadCount = await this.messageRepo.getUnreadCountByConversation(conversationId, userId);

    return this.mapConversationToResponse(conversation, userId, unreadCount);
  }

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
            createdAt: conversation.lastMessageAt?.toISOString() ?? new Date().toISOString(),
            isRead: unreadCount === 0,
          }
        : null,
      unreadCount,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
