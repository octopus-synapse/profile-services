/**
 * In-Memory Conversation Repository for Testing
 *
 * Provides in-memory implementation of ConversationRepository for unit tests.
 */

interface StoredUser {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  username: string | null;
}

interface StoredConversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1: StoredUser;
  participant2: StoredUser;
  lastMessageContent: string | null;
  lastMessageAt: Date | null;
  lastMessageSenderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryConversationRepository {
  private conversations = new Map<string, StoredConversation>();
  private users = new Map<string, StoredUser>();
  private idCounter = 0;

  // ============ Repository Interface Implementation ============

  async findOrCreate(userId1: string, userId2: string): Promise<StoredConversation> {
    const [participant1Id, participant2Id] = [userId1, userId2].sort();

    // Check existing
    for (const conv of this.conversations.values()) {
      if (conv.participant1Id === participant1Id && conv.participant2Id === participant2Id) {
        return conv;
      }
    }

    // Create new
    const now = new Date();
    const conversation: StoredConversation = {
      id: `conv-${++this.idCounter}`,
      participant1Id,
      participant2Id,
      participant1: this.getOrCreateUser(participant1Id),
      participant2: this.getOrCreateUser(participant2Id),
      lastMessageContent: null,
      lastMessageAt: null,
      lastMessageSenderId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async findById(conversationId: string): Promise<StoredConversation | null> {
    return this.conversations.get(conversationId) ?? null;
  }

  async findByUserId(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<{
    conversations: StoredConversation[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    let conversations = Array.from(this.conversations.values())
      .filter((c) => c.participant1Id === userId || c.participant2Id === userId)
      .sort((a, b) => {
        const aTime = a.lastMessageAt?.getTime() ?? 0;
        const bTime = b.lastMessageAt?.getTime() ?? 0;
        return bTime - aTime;
      });

    // Apply cursor
    if (options.cursor) {
      const cursorIndex = conversations.findIndex((c) => c.id === options.cursor);
      if (cursorIndex !== -1) {
        conversations = conversations.slice(cursorIndex + 1);
      }
    }

    // Check if has more
    const hasMore = conversations.length > options.limit;
    if (hasMore) {
      conversations = conversations.slice(0, options.limit);
    }

    return {
      conversations,
      nextCursor: hasMore ? (conversations[conversations.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async updateLastMessage(
    conversationId: string,
    data: { content: string; senderId: string; timestamp: Date },
  ): Promise<StoredConversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    conversation.lastMessageContent = data.content.substring(0, 100);
    conversation.lastMessageAt = data.timestamp;
    conversation.lastMessageSenderId = data.senderId;
    conversation.updatedAt = new Date();

    return conversation;
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    return conversation.participant1Id === userId || conversation.participant2Id === userId;
  }

  async getOtherParticipant(conversationId: string, userId: string): Promise<StoredUser | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    return conversation.participant1Id === userId
      ? conversation.participant2
      : conversation.participant1;
  }

  // ============ Test Helpers ============

  private getOrCreateUser(userId: string): StoredUser {
    const existingUser = this.users.get(userId);
    if (existingUser) {
      return existingUser;
    }
    const user: StoredUser = {
      id: userId,
      displayName: `User ${userId}`,
      photoURL: null,
      username: userId,
    };
    this.users.set(userId, user);
    return user;
  }

  seedUser(user: Partial<StoredUser> & { id: string }): void {
    this.users.set(user.id, {
      id: user.id,
      displayName: user.displayName ?? `User ${user.id}`,
      photoURL: user.photoURL ?? null,
      username: user.username ?? user.id,
    });
  }

  seedConversation(conv: Partial<StoredConversation> & { id: string }): void {
    const now = new Date();
    const participant1Id = conv.participant1Id ?? 'user-1';
    const participant2Id = conv.participant2Id ?? 'user-2';

    this.conversations.set(conv.id, {
      id: conv.id,
      participant1Id,
      participant2Id,
      participant1: conv.participant1 ?? this.getOrCreateUser(participant1Id),
      participant2: conv.participant2 ?? this.getOrCreateUser(participant2Id),
      lastMessageContent: conv.lastMessageContent ?? null,
      lastMessageAt: conv.lastMessageAt ?? null,
      lastMessageSenderId: conv.lastMessageSenderId ?? null,
      createdAt: conv.createdAt ?? now,
      updatedAt: conv.updatedAt ?? now,
    });
  }

  getConversation(id: string): StoredConversation | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): StoredConversation[] {
    return Array.from(this.conversations.values());
  }

  clear(): void {
    this.conversations.clear();
    this.users.clear();
    this.idCounter = 0;
  }
}
