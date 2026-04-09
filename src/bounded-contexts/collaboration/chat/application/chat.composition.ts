import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { BlockedUserRepository } from '../repositories/blocked-user.repository';
import type { ConversationRepository } from '../repositories/conversation.repository';
import type { MessageRepository } from '../repositories/message.repository';
import type { ChatCacheService } from '../services/chat-cache.service';
import { CHAT_USE_CASES, type ChatUseCases } from './ports/chat.port';
import { GetConversationUseCase } from './use-cases/get-conversation/get-conversation.use-case';
import { GetConversationIdUseCase } from './use-cases/get-conversation-id/get-conversation-id.use-case';
import { GetConversationsUseCase } from './use-cases/get-conversations/get-conversations.use-case';
import { GetMessagesUseCase } from './use-cases/get-messages/get-messages.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count/get-unread-count.use-case';
import { MarkConversationReadUseCase } from './use-cases/mark-conversation-read/mark-conversation-read.use-case';
import { SendMessageUseCase } from './use-cases/send-message/send-message.use-case';
import { SendMessageToConversationUseCase } from './use-cases/send-message-to-conversation/send-message-to-conversation.use-case';

export { CHAT_USE_CASES };

export function buildChatUseCases(
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  blockedUserRepo: BlockedUserRepository,
  eventPublisher: EventPublisherPort,
  chatCache: ChatCacheService,
): ChatUseCases {
  return {
    sendMessageUseCase: new SendMessageUseCase(
      conversationRepo,
      messageRepo,
      blockedUserRepo,
      eventPublisher,
      chatCache,
    ),
    sendMessageToConversationUseCase: new SendMessageToConversationUseCase(
      conversationRepo,
      messageRepo,
      blockedUserRepo,
      chatCache,
    ),
    getMessagesUseCase: new GetMessagesUseCase(conversationRepo, messageRepo),
    getConversationsUseCase: new GetConversationsUseCase(conversationRepo, messageRepo),
    getConversationUseCase: new GetConversationUseCase(conversationRepo, messageRepo),
    markConversationReadUseCase: new MarkConversationReadUseCase(
      conversationRepo,
      messageRepo,
      chatCache,
    ),
    getUnreadCountUseCase: new GetUnreadCountUseCase(messageRepo, chatCache),
    getConversationIdUseCase: new GetConversationIdUseCase(conversationRepo),
  };
}
