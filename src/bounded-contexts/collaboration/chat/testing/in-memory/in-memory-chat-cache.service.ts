/**
 * In-Memory Chat Cache Service for Testing
 *
 * Provides in-memory implementation of ChatCacheService for unit tests.
 */

interface UnreadCountResult {
  totalUnread: number;
  byConversation: Record<string, number>;
}

interface OnlineStatus {
  isOnline: boolean;
  lastSeen: string;
}

export class InMemoryChatCacheService {
  private unreadCache = new Map<string, UnreadCountResult>();
  private conversationsCache = new Map<string, unknown>();
  private onlineStatusCache = new Map<string, OnlineStatus>();

  // ============ Service Interface Implementation ============

  async getUnreadCount<T extends UnreadCountResult>(
    userId: string,
    computeFn: () => Promise<T>,
  ): Promise<T> {
    const cached = this.unreadCache.get(userId);
    if (cached) {
      return cached as T;
    }

    const result = await computeFn();
    this.unreadCache.set(userId, result);
    return result;
  }

  async invalidateUnread(userId: string): Promise<void> {
    this.unreadCache.delete(userId);
  }

  async getConversations<T>(userId: string, computeFn: () => Promise<T>): Promise<T> {
    const cached = this.conversationsCache.get(userId);
    if (cached) {
      return cached as T;
    }

    const result = await computeFn();
    this.conversationsCache.set(userId, result);
    return result;
  }

  async invalidateConversations(userId: string): Promise<void> {
    this.conversationsCache.delete(userId);
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    this.onlineStatusCache.set(userId, {
      isOnline,
      lastSeen: new Date().toISOString(),
    });
  }

  async getOnlineStatus(userId: string): Promise<OnlineStatus | null> {
    return this.onlineStatusCache.get(userId) ?? null;
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await Promise.all([this.invalidateUnread(userId), this.invalidateConversations(userId)]);
  }

  // ============ Test Helpers ============

  seedUnreadCount(userId: string, data: UnreadCountResult): void {
    this.unreadCache.set(userId, data);
  }

  seedConversations<T>(userId: string, data: T): void {
    this.conversationsCache.set(userId, data);
  }

  seedOnlineStatus(userId: string, status: OnlineStatus): void {
    this.onlineStatusCache.set(userId, status);
  }

  getUnreadCache(userId: string): UnreadCountResult | undefined {
    return this.unreadCache.get(userId);
  }

  getConversationsCache(userId: string): unknown {
    return this.conversationsCache.get(userId);
  }

  isUnreadCached(userId: string): boolean {
    return this.unreadCache.has(userId);
  }

  isConversationsCached(userId: string): boolean {
    return this.conversationsCache.has(userId);
  }

  clear(): void {
    this.unreadCache.clear();
    this.conversationsCache.clear();
    this.onlineStatusCache.clear();
  }
}
