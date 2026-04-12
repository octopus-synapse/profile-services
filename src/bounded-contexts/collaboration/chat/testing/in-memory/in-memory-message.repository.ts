/**
 * In-Memory Message Repository for Testing
 *
 * Provides in-memory implementation of MessageRepository for unit tests.
 */

interface StoredSender {
  id: string;
  name: string | null;
  photoURL: string | null;
}

interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  sender: StoredSender;
}

interface ConversationParticipants {
  participant1Id: string;
  participant2Id: string;
}

export class InMemoryMessageRepository {
  private messages = new Map<string, StoredMessage>();
  private senders = new Map<string, StoredSender>();
  private conversationParticipants = new Map<string, ConversationParticipants>();
  private idCounter = 0;

  // ============ Repository Interface Implementation ============

  async create(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<StoredMessage> {
    const sender = this.getOrCreateSender(data.senderId);
    const message: StoredMessage = {
      id: `msg-${++this.idCounter}`,
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      isRead: false,
      readAt: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      sender,
    };

    this.messages.set(message.id, message);
    return message;
  }

  async findByConversationId(
    conversationId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    messages: StoredMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    let messages = Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId && !m.isDeleted)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply cursor
    if (options.cursor) {
      const cursorIndex = messages.findIndex((m) => m.id === options.cursor);
      if (cursorIndex !== -1) {
        messages = messages.slice(cursorIndex + 1);
      }
    }

    // Check if has more
    const hasMore = messages.length > options.limit;
    if (hasMore) {
      messages = messages.slice(0, options.limit);
    }

    // Reverse to get chronological order
    messages.reverse();

    return {
      messages,
      nextCursor: hasMore ? (messages[0]?.id ?? null) : null,
      hasMore,
    };
  }

  async markAsRead(messageId: string, userId: string): Promise<{ count: number }> {
    const message = this.messages.get(messageId);
    if (!message || message.senderId === userId || message.isRead) {
      return { count: 0 };
    }

    message.isRead = true;
    message.readAt = new Date();
    return { count: 1 };
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<{ count: number }> {
    let count = 0;

    for (const message of this.messages.values()) {
      if (
        message.conversationId === conversationId &&
        message.senderId !== userId &&
        !message.isRead
      ) {
        message.isRead = true;
        message.readAt = new Date();
        count++;
      }
    }

    return { count };
  }

  async getUnreadCount(userId: string): Promise<{
    totalUnread: number;
    byConversation: Record<string, number>;
  }> {
    const byConversation: Record<string, number> = {};
    let totalUnread = 0;

    for (const message of this.messages.values()) {
      if (message.isDeleted || message.isRead || message.senderId === userId) {
        continue;
      }

      // Check if user is a participant in this conversation
      const participants = this.conversationParticipants.get(message.conversationId);
      if (!participants) continue;

      if (participants.participant1Id !== userId && participants.participant2Id !== userId) {
        continue;
      }

      byConversation[message.conversationId] = (byConversation[message.conversationId] ?? 0) + 1;
      totalUnread++;
    }

    return { totalUnread, byConversation };
  }

  async getUnreadCountByConversation(conversationId: string, userId: string): Promise<number> {
    let count = 0;

    for (const message of this.messages.values()) {
      if (
        message.conversationId === conversationId &&
        message.senderId !== userId &&
        !message.isRead &&
        !message.isDeleted
      ) {
        count++;
      }
    }

    return count;
  }

  async softDelete(messageId: string, userId: string): Promise<{ count: number }> {
    const message = this.messages.get(messageId);
    if (!message || message.senderId !== userId) {
      return { count: 0 };
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    return { count: 1 };
  }

  async findById(messageId: string): Promise<StoredMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  // ============ Test Helpers ============

  private getOrCreateSender(senderId: string): StoredSender {
    const existingSender = this.senders.get(senderId);
    if (existingSender) {
      return existingSender;
    }
    const sender: StoredSender = {
      id: senderId,
      name: `User ${senderId}`,
      photoURL: null,
    };
    this.senders.set(senderId, sender);
    return sender;
  }

  seedSender(sender: Partial<StoredSender> & { id: string }): void {
    this.senders.set(sender.id, {
      id: sender.id,
      name: sender.name ?? `User ${sender.id}`,
      photoURL: sender.photoURL ?? null,
    });
  }

  seedConversationParticipants(
    conversationId: string,
    participant1Id: string,
    participant2Id: string,
  ): void {
    this.conversationParticipants.set(conversationId, {
      participant1Id,
      participant2Id,
    });
  }

  seedMessage(msg: Partial<StoredMessage> & { id: string }): void {
    const senderId = msg.senderId ?? 'user-1';
    this.messages.set(msg.id, {
      id: msg.id,
      conversationId: msg.conversationId ?? 'conv-1',
      senderId,
      content: msg.content ?? 'Test message',
      isRead: msg.isRead ?? false,
      readAt: msg.readAt ?? null,
      isDeleted: msg.isDeleted ?? false,
      deletedAt: msg.deletedAt ?? null,
      createdAt: msg.createdAt ?? new Date(),
      sender: msg.sender ?? this.getOrCreateSender(senderId),
    });
  }

  getMessage(id: string): StoredMessage | undefined {
    return this.messages.get(id);
  }

  getAllMessages(): StoredMessage[] {
    return Array.from(this.messages.values());
  }

  getMessagesByConversation(conversationId: string): StoredMessage[] {
    return Array.from(this.messages.values()).filter((m) => m.conversationId === conversationId);
  }

  clear(): void {
    this.messages.clear();
    this.senders.clear();
    this.conversationParticipants.clear();
    this.idCounter = 0;
  }
}
