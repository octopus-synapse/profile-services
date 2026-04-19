import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { MessageResponse } from '../../../schemas/chat.schema';
import { mapMessageToResponse } from '../../mappers/chat.mapper';
import type {
  BlockedUserRepositoryPort,
  ChatCachePort,
  ConversationRepositoryPort,
  MessageRepositoryPort,
} from '../../ports/chat.port';

export class SendMessageToConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
    private readonly blockedUserRepo: BlockedUserRepositoryPort,
    private readonly chatCache: ChatCachePort,
  ) {}

  async execute(
    senderId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageResponse> {
    const isParticipant = await this.conversationRepo.isParticipant(conversationId, senderId);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const otherParticipant = await this.conversationRepo.getOtherParticipant(
      conversationId,
      senderId,
    );
    if (!otherParticipant) {
      throw new EntityNotFoundException('Conversation', conversationId);
    }

    const isBlocked = await this.blockedUserRepo.isBlockedBetween(senderId, otherParticipant.id);
    if (isBlocked) {
      throw new ForbiddenException('Cannot send message to this user');
    }

    const message = await this.messageRepo.create({
      conversationId,
      senderId,
      content,
    });

    await this.conversationRepo.updateLastMessage(conversationId, {
      content,
      senderId,
      timestamp: message.createdAt,
    });

    await Promise.all([
      this.chatCache.invalidateUnread(otherParticipant.id),
      this.chatCache.invalidateConversations(senderId),
      this.chatCache.invalidateConversations(otherParticipant.id),
    ]);

    return mapMessageToResponse(message);
  }
}
