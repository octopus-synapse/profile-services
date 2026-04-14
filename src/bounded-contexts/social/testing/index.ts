/**
 * Social Bounded Context Testing Module
 *
 * Port-level in-memory fakes for social features.
 */

import {
  ActivityRepositoryPort,
  type ActivityType,
  type ActivityWithUser,
} from '../application/ports/activity.port';
import {
  ConnectionRepositoryPort,
  type ConnectionUser,
  type ConnectionWithUser,
} from '../application/ports/connection.port';
import {
  FollowRepositoryPort,
  type FollowWithUser,
  type PaginationParams,
} from '../application/ports/follow.port';
import { SocialEventBusPort } from '../application/ports/social-event-bus.port';
import { SocialLoggerPort } from '../application/ports/social-logger.port';

// ═══════════════════════════════════════════════════════════════
// USER RECORD (fixture type)
// ═══════════════════════════════════════════════════════════════

export interface UserRecord {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY FOLLOW REPOSITORY — implements FollowRepositoryPort
// ═══════════════════════════════════════════════════════════════

export class InMemoryFollowRepository extends FollowRepositoryPort {
  private follows: FollowWithUser[] = [];
  private users: UserRecord[] = [];
  private idCounter = 0;

  async createFollow(followerId: string, followingId: string): Promise<FollowWithUser> {
    const following = this.users.find((u) => u.id === followingId);
    const follow: FollowWithUser = {
      id: `follow-${++this.idCounter}`,
      followerId,
      followingId,
      createdAt: new Date(),
      following: following ?? undefined,
    };
    this.follows.push(follow);
    return follow;
  }

  async deleteFollow(followerId: string, followingId: string): Promise<void> {
    this.follows = this.follows.filter(
      (f) => !(f.followerId === followerId && f.followingId === followingId),
    );
  }

  async findFollow(followerId: string, followingId: string): Promise<FollowWithUser | null> {
    return (
      this.follows.find(
        (f) => f.followerId === followerId && f.followingId === followingId,
      ) ?? null
    );
  }

  async findFollowers(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: FollowWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.follows
      .filter((f) => f.followingId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async findFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: FollowWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.follows
      .filter((f) => f.followerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async countFollowers(userId: string): Promise<number> {
    return this.follows.filter((f) => f.followingId === userId).length;
  }

  async countFollowing(userId: string): Promise<number> {
    return this.follows.filter((f) => f.followerId === userId).length;
  }

  async findFollowingIds(userId: string): Promise<string[]> {
    return this.follows.filter((f) => f.followerId === userId).map((f) => f.followingId);
  }

  async findFollowerIds(userId: string): Promise<string[]> {
    return this.follows.filter((f) => f.followingId === userId).map((f) => f.followerId);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.users.some((u) => u.id === userId);
  }

  // Test helpers
  seedUser(user: UserRecord): void {
    this.users.push(user);
  }

  seedUsers(users: UserRecord[]): void {
    this.users.push(...users);
  }

  seedFollow(follow: Partial<FollowWithUser> & { followerId: string; followingId: string }): void {
    this.follows.push({
      id: follow.id ?? `follow-${++this.idCounter}`,
      followerId: follow.followerId,
      followingId: follow.followingId,
      createdAt: follow.createdAt ?? new Date(),
      follower: follow.follower,
      following: follow.following,
    });
  }

  clear(): void {
    this.follows = [];
    this.users = [];
    this.idCounter = 0;
  }

  getAll(): FollowWithUser[] {
    return [...this.follows];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY ACTIVITY REPOSITORY — implements ActivityRepositoryPort
// ═══════════════════════════════════════════════════════════════

export class InMemoryActivityRepository extends ActivityRepositoryPort {
  private activities: ActivityWithUser[] = [];
  private idCounter = 0;

  async createActivity(data: {
    userId: string;
    type: ActivityType;
    metadata?: unknown;
    entityId?: string;
    entityType?: string;
  }): Promise<ActivityWithUser> {
    const activity: ActivityWithUser = {
      id: `activity-${++this.idCounter}`,
      userId: data.userId,
      type: data.type,
      metadata: data.metadata ?? null,
      entityId: data.entityId ?? null,
      entityType: data.entityType ?? null,
      createdAt: new Date(),
    };
    this.activities.push(activity);
    return activity;
  }

  async findActivityWithUser(activityId: string): Promise<ActivityWithUser | null> {
    return this.activities.find((a) => a.id === activityId) ?? null;
  }

  async findActivitiesByUserIds(
    userIds: string[],
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.activities
      .filter((a) => userIds.includes(a.userId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async findUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.activities
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async findUserActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.activities
      .filter((a) => a.userId === userId && a.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const before = this.activities.length;
    this.activities = this.activities.filter((a) => a.createdAt >= date);
    return before - this.activities.length;
  }

  seedActivity(activity: Partial<ActivityWithUser> & { userId: string; type: ActivityType }): void {
    this.activities.push({
      id: activity.id ?? `activity-${++this.idCounter}`,
      userId: activity.userId,
      type: activity.type,
      metadata: activity.metadata ?? null,
      entityId: activity.entityId ?? null,
      entityType: activity.entityType ?? null,
      createdAt: activity.createdAt ?? new Date(),
      user: activity.user,
    });
  }

  clear(): void {
    this.activities = [];
    this.idCounter = 0;
  }

  getAll(): ActivityWithUser[] {
    return [...this.activities];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY CONNECTION REPOSITORY — implements ConnectionRepositoryPort
// ═══════════════════════════════════════════════════════════════

export class InMemoryConnectionRepository extends ConnectionRepositoryPort {
  private connections: ConnectionWithUser[] = [];
  private users: UserRecord[] = [];
  private idCounter = 0;

  async createConnection(requesterId: string, targetId: string): Promise<ConnectionWithUser> {
    const requester = this.users.find((u) => u.id === requesterId);
    const target = this.users.find((u) => u.id === targetId);
    const connection: ConnectionWithUser = {
      id: `connection-${++this.idCounter}`,
      requesterId,
      targetId,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: requester ?? undefined,
      target: target ?? undefined,
    };
    this.connections.push(connection);
    return connection;
  }

  async findConnectionById(id: string): Promise<ConnectionWithUser | null> {
    return this.connections.find((c) => c.id === id) ?? null;
  }

  async findConnection(
    requesterId: string,
    targetId: string,
  ): Promise<ConnectionWithUser | null> {
    return (
      this.connections.find(
        (c) => c.requesterId === requesterId && c.targetId === targetId,
      ) ?? null
    );
  }

  async findConnectionBetween(
    userA: string,
    userB: string,
  ): Promise<ConnectionWithUser | null> {
    return (
      this.connections.find(
        (c) =>
          (c.requesterId === userA && c.targetId === userB) ||
          (c.requesterId === userB && c.targetId === userA),
      ) ?? null
    );
  }

  async updateConnectionStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<ConnectionWithUser> {
    const connection = this.connections.find((c) => c.id === id);
    if (!connection) throw new Error(`Connection ${id} not found`);
    connection.status = status;
    connection.updatedAt = new Date();
    return connection;
  }

  async deleteConnection(id: string): Promise<void> {
    this.connections = this.connections.filter((c) => c.id !== id);
  }

  async findPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.connections
      .filter((c) => c.targetId === userId && c.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async findAcceptedConnections(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ConnectionWithUser[]; total: number }> {
    const { page, limit } = pagination;
    const filtered = this.connections
      .filter(
        (c) =>
          c.status === 'ACCEPTED' && (c.requesterId === userId || c.targetId === userId),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
    };
  }

  async countAcceptedConnections(userId: string): Promise<number> {
    return this.connections.filter(
      (c) => c.status === 'ACCEPTED' && (c.requesterId === userId || c.targetId === userId),
    ).length;
  }

  async findSuggestions(userId: string, limit: number): Promise<ConnectionUser[]> {
    const excludeIds = new Set<string>([userId]);
    for (const c of this.connections) {
      if (c.requesterId === userId) excludeIds.add(c.targetId);
      if (c.targetId === userId) excludeIds.add(c.requesterId);
    }
    return this.users.filter((u) => !excludeIds.has(u.id)).slice(0, limit);
  }

  async findRankedSuggestions(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{
    data: Array<ConnectionUser & { reason: string; score: number }>;
    total: number;
  }> {
    const { page, limit } = pagination;
    const suggestions = await this.findSuggestions(userId, 1000);
    const ranked = suggestions.map((u) => ({
      ...u,
      reason: 'Suggested for you',
      score: 0,
    }));
    return {
      data: ranked.slice((page - 1) * limit, page * limit),
      total: ranked.length,
    };
  }

  async userExists(userId: string): Promise<boolean> {
    return this.users.some((u) => u.id === userId);
  }

  // Test helpers
  seedUser(user: UserRecord): void {
    this.users.push(user);
  }

  seedUsers(users: UserRecord[]): void {
    this.users.push(...users);
  }

  seedConnection(
    connection: Partial<ConnectionWithUser> & {
      requesterId: string;
      targetId: string;
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    },
  ): void {
    this.connections.push({
      id: connection.id ?? `connection-${++this.idCounter}`,
      requesterId: connection.requesterId,
      targetId: connection.targetId,
      status: connection.status,
      createdAt: connection.createdAt ?? new Date(),
      updatedAt: connection.updatedAt ?? new Date(),
      requester: connection.requester,
      target: connection.target,
    });
  }

  clear(): void {
    this.connections = [];
    this.users = [];
    this.idCounter = 0;
  }

  getAll(): ConnectionWithUser[] {
    return [...this.connections];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY LOGGER + EVENT BUS
// ═══════════════════════════════════════════════════════════════

export class InMemorySocialLogger extends SocialLoggerPort {
  log(): void {}
  debug(): void {}
  warn(): void {}
  error(): void {}
}

export class InMemorySocialEventBus extends SocialEventBusPort {
  readonly emitted: Array<{ event: string; payload: unknown }> = [];

  emit(event: string, payload: unknown): void {
    this.emitted.push({ event, payload });
  }

  clear(): void {
    this.emitted.length = 0;
  }
}
