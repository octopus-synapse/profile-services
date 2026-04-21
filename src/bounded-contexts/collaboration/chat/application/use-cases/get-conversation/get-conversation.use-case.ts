import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { NotConversationParticipantException } from '../../../../domain/exceptions/collaboration.exceptions';
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
      throw new EntityNotFoundException('Conversation', conversationId);
    }

    const isParticipant =
      conversation.participant1Id === userId || conversation.participant2Id === userId;
    if (!isParticipant) {
      throw new NotConversationParticipantException();
    }

    const unreadCount = await this.messageRepo.getUnreadCountByConversation(conversationId, userId);

    return mapConversationToResponse(conversation, userId, unreadCount);
  }
}
