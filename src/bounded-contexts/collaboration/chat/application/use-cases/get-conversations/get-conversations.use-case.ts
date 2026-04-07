import type {
  ConversationResponse,
  GetConversationsQuery,
  PaginatedConversationsResponse,
} from '../../../schemas/chat.schema';
import type {
  ConversationRepositoryPort,
  ConversationWithParticipants,
  MessageRepositoryPort,
} from '../../ports/chat.port';

export class GetConversationsUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
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
        return this.mapConversationToResponse(conv, userId, unreadCount);
      }),
    );

    return {
      conversations: conversationsWithUnread,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
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
