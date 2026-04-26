import { NotConversationParticipantException } from '../../../../domain/exceptions/collaboration.exceptions';
import {
  ChatCachePort,
  ConversationRepositoryPort,
  MessageRepositoryPort,
} from '../../ports/chat.port';

export class MarkConversationReadUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
    private readonly chatCache: ChatCachePort,
  ) {}

  async execute(userId: string, conversationId: string): Promise<{ count: number }> {
    const isParticipant = await this.conversationRepo.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new NotConversationParticipantException();
    }

    const result = await this.messageRepo.markConversationAsRead(conversationId, userId);

    await this.chatCache.invalidateUnread(userId);

    return { count: result.count };
  }
}
