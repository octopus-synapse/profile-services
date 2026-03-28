/**
 * Chat Cache Service
 * Provides caching layer for chat operations using Redis
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';

interface UnreadCountResult {
  totalUnread: number;
  byConversation: Record<string, number>;
}

@Injectable()
export class ChatCacheService {
  private readonly UNREAD_TTL = 30; // 30 seconds
  private readonly CONVERSATIONS_TTL = 60; // 60 seconds
  private readonly ONLINE_TTL = 120; // 2 minutes

  constructor(private readonly cache: CacheService) {}

  // Cache key generators
  private unreadKey(userId: string): string {
    return `chat:unread:${userId}`;
  }

  private conversationsKey(userId: string): string {
    return `chat:convs:${userId}`;
  }

  private onlineKey(userId: string): string {
    return `chat:online:${userId}`;
  }

  /**
   * Get unread count from cache or compute it
   */
  async getUnreadCount<T extends UnreadCountResult>(
    userId: string,
    computeFn: () => Promise<T>,
  ): Promise<T> {
    return this.cache.getOrSet(this.unreadKey(userId), computeFn, this.UNREAD_TTL);
  }

  /**
   * Invalidate unread count cache for a user
   */
  async invalidateUnread(userId: string): Promise<void> {
    await this.cache.delete(this.unreadKey(userId));
  }

  /**
   * Get conversations from cache or compute them
   */
  async getConversations<T>(userId: string, computeFn: () => Promise<T>): Promise<T> {
    return this.cache.getOrSet(this.conversationsKey(userId), computeFn, this.CONVERSATIONS_TTL);
  }

  /**
   * Invalidate conversations cache for a user
   */
  async invalidateConversations(userId: string): Promise<void> {
    await this.cache.delete(this.conversationsKey(userId));
  }

  /**
   * Set user online status
   */
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.cache.set(
      this.onlineKey(userId),
      { isOnline, lastSeen: new Date().toISOString() },
      this.ONLINE_TTL,
    );
  }

  /**
   * Get user online status
   */
  async getOnlineStatus(userId: string): Promise<{ isOnline: boolean; lastSeen: string } | null> {
    return this.cache.get(this.onlineKey(userId));
  }

  /**
   * Invalidate all chat caches for a user (used on block/unblock)
   */
  async invalidateAllForUser(userId: string): Promise<void> {
    await Promise.all([this.invalidateUnread(userId), this.invalidateConversations(userId)]);
  }
}
