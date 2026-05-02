import { LoggerPort } from '@/shared-kernel';
import { NotConversationParticipantException } from '../../../../domain/exceptions/collaboration.exceptions';
import { ChatConversationNotFoundException } from '../../../domain/exceptions/chat.exceptions';
import type { ConversationResponse } from '../../../schemas/chat.schema';
import { mapConversationToResponse } from '../../mappers/chat.mapper';
import { ConversationRepositoryPort, MessageRepositoryPort } from '../../ports/chat.port';

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, conversationId: string): Promise<ConversationResponse> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new ChatConversationNotFoundException(conversationId);
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
