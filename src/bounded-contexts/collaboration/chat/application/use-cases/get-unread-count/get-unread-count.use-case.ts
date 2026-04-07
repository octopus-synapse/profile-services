import type { ChatCachePort, MessageRepositoryPort } from '../../ports/chat.port';

export class GetUnreadCountUseCase {
  constructor(
    private readonly messageRepo: MessageRepositoryPort,
    private readonly chatCache: ChatCachePort,
  ) {}

  async execute(userId: string) {
    return this.chatCache.getUnreadCount(userId, () => this.messageRepo.getUnreadCount(userId));
  }
}
