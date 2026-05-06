import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  CannotSendMessageToUserException,
  NotConversationParticipantException,
} from '../../../../domain/exceptions/collaboration.exceptions';
import type { MessageResponse } from '../../../schemas/chat.schema';
import { toMessageResponseDto } from '../../mappers/chat.mapper';
import {
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
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    senderId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageResponse> {
    const isParticipant = await this.conversationRepo.isParticipant(conversationId, senderId);
    if (!isParticipant) {
      throw new NotConversationParticipantException();
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
      throw new CannotSendMessageToUserException();
    }

    // P1-056 — message create + lastMessage pointer update ought to
    // be atomic; today they're sequential. If `updateLastMessage`
    // fails after `messageRepo.create` succeeds the message is in the
    // conversation but the inbox preview shows the previous message.
    // The next message succeeds and overwrites. Recovery is bounded
    // (next message fixes), so we don't bubble the lastMessage error
    // up to the user — log and continue.
    const message = await this.messageRepo.create({ conversationId, senderId, content });

    try {
      await this.conversationRepo.updateLastMessage(conversationId, {
        content,
        senderId,
        timestamp: message.createdAt,
      });
    } catch (err) {
      this.logger.warn(
        `Conversation lastMessage pointer update failed for ${conversationId} (recovers on next message): ${err instanceof Error ? err.message : String(err)}`,
        'SendMessageToConversation',
      );
    }

    await Promise.all([
      this.chatCache.invalidateUnread(otherParticipant.id),
      this.chatCache.invalidateConversations(senderId),
      this.chatCache.invalidateConversations(otherParticipant.id),
    ]);

    return toMessageResponseDto(message);
  }
}
