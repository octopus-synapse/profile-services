import { ForbiddenException } from '@nestjs/common';
import type {
  GetMessagesQuery,
  MessageResponse,
  PaginatedMessagesResponse,
} from '../../../schemas/chat.schema';
import type {
  ConversationRepositoryPort,
  MessageRepositoryPort,
  MessageWithSender,
} from '../../ports/chat.port';

export class GetMessagesUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
  ) {}

  async execute(userId: string, query: GetMessagesQuery): Promise<PaginatedMessagesResponse> {
    const isParticipant = await this.conversationRepo.isParticipant(query.conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const result = await this.messageRepo.findByConversationId(query.conversationId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return {
      messages: result.messages.map((msg) => this.mapMessageToResponse(msg)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  private mapMessageToResponse(message: MessageWithSender): MessageResponse {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName,
        photoURL: message.sender.photoURL,
      },
    };
  }
}
