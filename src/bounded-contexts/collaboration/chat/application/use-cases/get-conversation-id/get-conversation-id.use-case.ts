import type { ConversationRepositoryPort } from '../../ports/chat.port';

export class GetConversationIdUseCase {
  constructor(private readonly conversationRepo: ConversationRepositoryPort) {}

  async execute(userId: string, otherUserId: string): Promise<string | null> {
    const conversation = await this.conversationRepo.findOrCreate(userId, otherUserId);
    return conversation.id;
  }
}
