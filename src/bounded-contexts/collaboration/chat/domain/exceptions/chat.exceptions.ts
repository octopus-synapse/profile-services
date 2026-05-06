import { EntityNotFoundException } from '@/shared-kernel/exceptions';

export class ChatConversationNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'CHAT_CONVERSATION_NOT_FOUND';
  constructor(conversationId?: string) {
    super('Conversation', conversationId);
  }
}
