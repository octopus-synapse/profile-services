import { ConversationRepositoryPort } from '../../ports/chat.port';
import { MessagePrivacyPolicyPort } from '../../ports/message-privacy.port';

export class GetConversationIdUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messagePrivacy: MessagePrivacyPolicyPort,
  ) {}

  async execute(userId: string, otherUserId: string): Promise<string | null> {
    // Same gate as send-message — creating a conversation must respect blocking
    // + the recipient's messagePrivacy (this path previously had no block
    // check, a bypass; closed here).
    await this.messagePrivacy.assertCanMessage(userId, otherUserId);
    const conversation = await this.conversationRepo.findOrCreate(userId, otherUserId);
    return conversation.id;
  }
}
