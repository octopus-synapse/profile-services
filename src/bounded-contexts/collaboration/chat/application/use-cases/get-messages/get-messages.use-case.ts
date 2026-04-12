import { ForbiddenException } from '@nestjs/common';
import type { GetMessagesQuery, PaginatedMessagesResponse } from '../../../schemas/chat.schema';
import { mapMessageToResponse } from '../../mappers/chat.mapper';
import type { ConversationRepositoryPort, MessageRepositoryPort } from '../../ports/chat.port';

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
      messages: result.messages.map(mapMessageToResponse),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
}
