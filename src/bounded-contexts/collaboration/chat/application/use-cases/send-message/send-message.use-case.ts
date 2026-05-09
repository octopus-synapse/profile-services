import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  CannotMessageSelfException,
  CannotSendMessageToUserException,
} from '../../../../domain/exceptions/collaboration.exceptions';
import { MessageSentEvent } from '../../../../shared-kernel/domain/events';
import type { MessageResponse, SendMessage } from '../../../schemas/chat.schema';
import { toMessageResponseDto } from '../../mappers/chat.mapper';
import {
  BlockedUserRepositoryPort,
  ChatCachePort,
  ConversationRepositoryPort,
  MessageRepositoryPort,
} from '../../ports/chat.port';

export class SendMessageUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepositoryPort,
    private readonly messageRepo: MessageRepositoryPort,
    private readonly blockedUserRepo: BlockedUserRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly chatCache: ChatCachePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(senderId: string, dto: SendMessage): Promise<MessageResponse> {
    const isBlocked = await this.blockedUserRepo.isBlockedBetween(senderId, dto.recipientId);
    if (isBlocked) {
      throw new CannotSendMessageToUserException();
    }

    if (senderId === dto.recipientId) {
      throw new CannotMessageSelfException();
    }

    const conversation = await this.conversationRepo.findOrCreate(senderId, dto.recipientId);

    const message = await this.messageRepo.create({
      conversationId: conversation.id,
      senderId,
      content: dto.content,
    });

    this.eventPublisher.publish(
      new MessageSentEvent(message.id, {
        senderId,
        conversationId: conversation.id,
        content: dto.content,
      }),
    );

    await this.conversationRepo.updateLastMessage(conversation.id, {
      content: dto.content,
      senderId,
      timestamp: message.createdAt,
    });

    await Promise.all([
      this.chatCache.invalidateUnread(dto.recipientId),
      this.chatCache.invalidateConversations(senderId),
      this.chatCache.invalidateConversations(dto.recipientId),
    ]);

    return toMessageResponseDto(message);
  }
}
