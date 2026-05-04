import { LoggerPort } from '@/shared-kernel';
import type {
  GetConversationsQuery,
  PaginatedConversationsResponse,
} from '../../../schemas/chat.schema';
import { toConversationResponseDto } from '../../mappers/chat.mapper';
import { ConversationRepositoryPort, MessageRepositoryPort } from '../../ports/chat.port';

export class GetConversationsUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    query: GetConversationsQuery,
  ): Promise<PaginatedConversationsResponse> {
    const result = await this.conversationRepo.findByUserId(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const conversationsWithUnread = await Promise.all(
      result.conversations.map(async (conv) => {
        const unreadCount = await this.messageRepo.getUnreadCountByConversation(conv.id, userId);
        return toConversationResponseDto(conv, userId, unreadCount);
      }),
    );

    return {
      conversations: conversationsWithUnread,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
}
