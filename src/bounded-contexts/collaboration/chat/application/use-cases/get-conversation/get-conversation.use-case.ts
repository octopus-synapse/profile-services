import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConversationResponse } from '../../../schemas/chat.schema';
import { mapConversationToResponse } from '../../mappers/chat.mapper';
import type { ConversationRepositoryPort, MessageRepositoryPort } from '../../ports/chat.port';

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

    return mapConversationToResponse(conversation, userId, unreadCount);
  }
}
