/**
 * In-Memory Blocked User Repository for Testing
 *
 * Provides in-memory implementation of BlockedUserRepository for unit tests.
 */

interface StoredUser {
  id: string;
  name: string | null;
  photoURL: string | null;
  username: string | null;
}

interface StoredBlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  reason: string | null;
  createdAt: Date;
  blocked: StoredUser;
}

export class InMemoryBlockedUserRepository {
  private blockedUsers = new Map<string, StoredBlockedUser>();
  private users = new Map<string, StoredUser>();
  private idCounter = 0;

  // ============ Repository Interface Implementation ============

  async block(blockerId: string, blockedId: string, reason?: string): Promise<StoredBlockedUser> {
    const key = `${blockerId}:${blockedId}`;

    const existing = this.blockedUsers.get(key);
    if (existing) {
      existing.reason = reason ?? existing.reason;
      existing.createdAt = new Date();
      return existing;
    }

    const blockedUser: StoredBlockedUser = {
      id: `block-${++this.idCounter}`,
      blockerId,
      blockedId,
      reason: reason ?? null,
      createdAt: new Date(),
      blocked: this.getOrCreateUser(blockedId),
    };

    this.blockedUsers.set(key, blockedUser);
    return blockedUser;
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    const key = `${blockerId}:${blockedId}`;
    this.blockedUsers.delete(key);
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const key = `${blockerId}:${blockedId}`;
    return this.blockedUsers.has(key);
  }

  async isBlockedBetween(userId1: string, userId2: string): Promise<boolean> {
    const key1 = `${userId1}:${userId2}`;
    const key2 = `${userId2}:${userId1}`;
    return this.blockedUsers.has(key1) || this.blockedUsers.has(key2);
  }

  async getBlockedUsers(blockerId: string): Promise<StoredBlockedUser[]> {
    return Array.from(this.blockedUsers.values())
      .filter((b) => b.blockerId === blockerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    return Array.from(this.blockedUsers.values())
      .filter((b) => b.blockerId === blockerId)
      .map((b) => b.blockedId);
  }

  async getBlockedByUserIds(blockedId: string): Promise<string[]> {
    return Array.from(this.blockedUsers.values())
      .filter((b) => b.blockedId === blockedId)
      .map((b) => b.blockerId);
  }

  // ============ Test Helpers ============

  private getOrCreateUser(userId: string): StoredUser {
    const existingUser = this.users.get(userId);
    if (existingUser) {
      return existingUser;
    }
    const user: StoredUser = {
      id: userId,
      name: `User ${userId}`,
      photoURL: null,
      username: userId,
    };
    this.users.set(userId, user);
    return user;
  }

  seedUser(user: Partial<StoredUser> & { id: string }): void {
    this.users.set(user.id, {
      id: user.id,
      name: user.name ?? `User ${user.id}`,
      photoURL: user.photoURL ?? null,
      username: user.username ?? user.id,
    });
  }

  seedBlock(block: { blockerId: string; blockedId: string; reason?: string }): void {
    const key = `${block.blockerId}:${block.blockedId}`;
    this.blockedUsers.set(key, {
      id: `block-${++this.idCounter}`,
      blockerId: block.blockerId,
      blockedId: block.blockedId,
      reason: block.reason ?? null,
      createdAt: new Date(),
      blocked: this.getOrCreateUser(block.blockedId),
    });
  }

  getBlock(blockerId: string, blockedId: string): StoredBlockedUser | undefined {
    const key = `${blockerId}:${blockedId}`;
    return this.blockedUsers.get(key);
  }

  getAllBlocks(): StoredBlockedUser[] {
    return Array.from(this.blockedUsers.values());
  }

  clear(): void {
    this.blockedUsers.clear();
    this.users.clear();
    this.idCounter = 0;
  }
}
