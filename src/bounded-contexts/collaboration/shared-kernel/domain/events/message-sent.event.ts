import { DomainEvent } from '@/shared-kernel';

export interface MessageSentPayload {
  readonly senderId: string;
  readonly conversationId: string;
  readonly content: string;
}

export class MessageSentEvent extends DomainEvent<MessageSentPayload> {
  static readonly TYPE = 'collaboration.message.sent';

  constructor(messageId: string, payload: MessageSentPayload) {
    super(MessageSentEvent.TYPE, messageId, payload);
  }
}
