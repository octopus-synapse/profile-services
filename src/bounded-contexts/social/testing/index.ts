/**
 * Social Bounded Context Testing Module
 *
 * In-memory implementations for testing social features:
 * - Follow relationships
 * - Activity tracking
 * - User interactions
 */

import type { ActivityType } from '../application/ports/activity.port';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
  following?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
}

export interface ActivityRecord {
  id: string;
  userId: string;
  type: ActivityType;
  metadata?: unknown;
  entityId?: string | null;
  entityType?: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
}

export interface UserRecord {
  id: string;
  name: string | null;
  username: string | null;
  photoURL: string | null;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY FOLLOW REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryFollowRepository {
  private follows: FollowRecord[] = [];

  // Prisma-like interface
  readonly follow = {
    create: async (args: {
      data: {
        followerId: string;
        followingId: string;
      };
      include?: {
        follower?: { select?: Record<string, boolean> };
        following?: { select?: Record<string, boolean> };
      };
    }): Promise<FollowRecord> => {
      const follow: FollowRecord = {
        id: `follow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        followerId: args.data.followerId,
        followingId: args.data.followingId,
        createdAt: new Date(),
      };

      this.follows.push(follow);
      return follow;
    },

    findFirst: async (args: {
      where: {
        followerId?: string;
        followingId?: string;
      };
    }): Promise<FollowRecord | null> => {
      const follow = this.follows.find(
        (f) =>
          (!args.where.followerId || f.followerId === args.where.followerId) &&
          (!args.where.followingId || f.followingId === args.where.followingId),
      );
      return follow ?? null;
    },

    findMany: async (args?: {
      where?: {
        followerId?: string;
        followingId?: string;
      };
      include?: {
        follower?: { select?: Record<string, boolean> };
        following?: { select?: Record<string, boolean> };
      };
      select?: {
        followingId?: boolean;
        followerId?: boolean;
      };
      orderBy?: { createdAt?: 'asc' | 'desc' };
      skip?: number;
      take?: number;
    }): Promise<FollowRecord[] | Array<{ followingId?: string; followerId?: string }>> => {
      let result = [...this.follows];

      // Filter by where conditions
      if (args?.where?.followerId) {
        result = result.filter((f) => f.followerId === args.where?.followerId);
      }

      if (args?.where?.followingId) {
        result = result.filter((f) => f.followingId === args.where?.followingId);
      }

      // Order by
      if (args?.orderBy?.createdAt) {
        result.sort((a, b) => {
          const order = args.orderBy?.createdAt === 'desc' ? -1 : 1;
          return order * (a.createdAt.getTime() - b.createdAt.getTime());
        });
      }

      // Pagination
      if (args?.skip !== undefined) {
        result = result.slice(args.skip);
      }

      if (args?.take !== undefined) {
        result = result.slice(0, args.take);
      }

      // Apply select if provided
      if (args?.select) {
        return result.map((f) => {
          const selected: { followingId?: string; followerId?: string } = {};
          if (args.select?.followingId) selected.followingId = f.followingId;
          if (args.select?.followerId) selected.followerId = f.followerId;
          return selected;
        });
      }

      return result;
    },

    count: async (args?: {
      where?: {
        followerId?: string;
        followingId?: string;
      };
    }): Promise<number> => {
      let result = this.follows;

      if (args?.where?.followerId) {
        result = result.filter((f) => f.followerId === args.where?.followerId);
      }

      if (args?.where?.followingId) {
        result = result.filter((f) => f.followingId === args.where?.followingId);
      }

      return result.length;
    },

    deleteMany: async (args: {
      where: {
        followerId?: string;
        followingId?: string;
      };
    }): Promise<{ count: number }> => {
      const initialLength = this.follows.length;

      this.follows = this.follows.filter(
        (f) =>
          !(
            (!args.where.followerId || f.followerId === args.where.followerId) &&
            (!args.where.followingId || f.followingId === args.where.followingId)
          ),
      );

      return { count: initialLength - this.follows.length };
    },
  };

  // Test helpers
  seed(follows: FollowRecord[]): void {
    this.follows = [...follows];
  }

  add(follow: FollowRecord): void {
    this.follows.push(follow);
  }

  clear(): void {
    this.follows = [];
  }

  getAll(): FollowRecord[] {
    return [...this.follows];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY ACTIVITY REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryActivityRepository {
  private activities: ActivityRecord[] = [];

  // Prisma-like interface
  readonly activity = {
    create: async (args: {
      data: {
        userId: string;
        type: ActivityType;
        metadata?: unknown;
        entityId?: string;
        entityType?: string;
      };
      include?: {
        user?: { select?: Record<string, boolean> };
      };
    }): Promise<ActivityRecord> => {
      const activity: ActivityRecord = {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: args.data.userId,
        type: args.data.type,
        metadata: args.data.metadata ?? null,
        entityId: args.data.entityId ?? null,
        entityType: args.data.entityType ?? null,
        createdAt: new Date(),
      };

      this.activities.push(activity);
      return activity;
    },

    findMany: async (args?: {
      where?: {
        userId?: string | { in: string[] };
        type?: ActivityType;
        createdAt?: { lt?: Date };
      };
      include?: {
        user?: { select?: Record<string, boolean> };
      };
      orderBy?: { createdAt?: 'asc' | 'desc' };
      skip?: number;
      take?: number;
    }): Promise<ActivityRecord[]> => {
      let result = [...this.activities];

      // Filter by where conditions
      if (args?.where?.userId) {
        const userId = args.where.userId;
        if (typeof userId === 'string') {
          result = result.filter((a) => a.userId === userId);
        } else if (userId.in) {
          result = result.filter((a) => userId.in.includes(a.userId));
        }
      }

      if (args?.where?.type) {
        result = result.filter((a) => a.type === args.where?.type);
      }

      const ltDateFilter = args?.where?.createdAt?.lt;
      if (ltDateFilter) {
        result = result.filter((a) => a.createdAt < ltDateFilter);
      }

      // Order by
      if (args?.orderBy?.createdAt) {
        result.sort((a, b) => {
          const order = args.orderBy?.createdAt === 'desc' ? -1 : 1;
          return order * (a.createdAt.getTime() - b.createdAt.getTime());
        });
      }

      // Pagination
      if (args?.skip !== undefined) {
        result = result.slice(args.skip);
      }

      if (args?.take !== undefined) {
        result = result.slice(0, args.take);
      }

      return result;
    },

    findUnique: async (args: {
      where: { id: string };
      include?: {
        user?: { select?: Record<string, boolean> };
      };
    }): Promise<ActivityRecord | null> => {
      const activity = this.activities.find((a) => a.id === args.where.id);
      return activity ?? null;
    },

    count: async (args?: {
      where?: {
        userId?: string | { in: string[] };
        type?: ActivityType;
      };
    }): Promise<number> => {
      let result = this.activities;

      if (args?.where?.userId) {
        const userId = args.where.userId;
        if (typeof userId === 'string') {
          result = result.filter((a) => a.userId === userId);
        } else if (userId.in) {
          result = result.filter((a) => userId.in.includes(a.userId));
        }
      }

      if (args?.where?.type) {
        result = result.filter((a) => a.type === args.where?.type);
      }

      return result.length;
    },

    deleteMany: async (args: {
      where: {
        createdAt?: { lt: Date };
      };
    }): Promise<{ count: number }> => {
      const initialLength = this.activities.length;

      const ltDate = args.where.createdAt?.lt;
      if (ltDate) {
        this.activities = this.activities.filter((a) => a.createdAt >= ltDate);
      }

      return { count: initialLength - this.activities.length };
    },
  };

  // Test helpers
  seed(activities: ActivityRecord[]): void {
    this.activities = [...activities];
  }

  add(activity: ActivityRecord): void {
    this.activities.push(activity);
  }

  clear(): void {
    this.activities = [];
  }

  getAll(): ActivityRecord[] {
    return [...this.activities];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY USER REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryUserRepository {
  private users: UserRecord[] = [];

  // Prisma-like interface
  readonly user = {
    findUnique: async (args: {
      where: { id?: string; username?: string };
      select?: Record<string, boolean>;
    }): Promise<UserRecord | null> => {
      const user = this.users.find(
        (u) =>
          (args.where.id && u.id === args.where.id) ||
          (args.where.username && u.username === args.where.username),
      );

      if (!user) return null;

      if (args.select) {
        const selectClause = args.select;
        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(selectClause)) {
          if (selectClause[key] && key in user) {
            selected[key] = user[key as keyof UserRecord];
          }
        }
        return selected as unknown as UserRecord;
      }

      return user;
    },
  };

  // Test helpers
  seed(users: UserRecord[]): void {
    this.users = [...users];
  }

  add(user: UserRecord): void {
    this.users.push(user);
  }

  clear(): void {
    this.users = [];
  }

  getAll(): UserRecord[] {
    return [...this.users];
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createFollowRecord(overrides: Partial<FollowRecord> = {}): FollowRecord {
  return {
    id: `follow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createActivityRecord(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user-1',
    type: 'RESUME_CREATED' as ActivityType,
    metadata: {},
    entityId: null,
    entityType: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Test User',
    username: 'testuser',
    photoURL: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_USERS: UserRecord[] = [
  createUserRecord({
    id: 'user-1',
    name: 'Alice Smith',
    username: 'alice',
    photoURL: null,
  }),
  createUserRecord({
    id: 'user-2',
    name: 'Bob Johnson',
    username: 'bob',
    photoURL: null,
  }),
  createUserRecord({
    id: 'user-3',
    name: 'Charlie Brown',
    username: 'charlie',
    photoURL: null,
  }),
];

export const DEFAULT_FOLLOWS: FollowRecord[] = [
  createFollowRecord({
    id: 'follow-1',
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date('2024-01-01'),
  }),
  createFollowRecord({
    id: 'follow-2',
    followerId: 'user-1',
    followingId: 'user-3',
    createdAt: new Date('2024-01-02'),
  }),
  createFollowRecord({
    id: 'follow-3',
    followerId: 'user-2',
    followingId: 'user-1',
    createdAt: new Date('2024-01-03'),
  }),
];

export const DEFAULT_ACTIVITIES: ActivityRecord[] = [
  createActivityRecord({
    id: 'activity-1',
    userId: 'user-1',
    type: 'RESUME_CREATED' as ActivityType,
    metadata: { resumeId: 'resume-1', title: 'Software Engineer Resume' },
    entityId: 'resume-1',
    entityType: 'resume',
    createdAt: new Date('2024-01-01'),
  }),
  createActivityRecord({
    id: 'activity-2',
    userId: 'user-2',
    type: 'SKILL_ADDED' as ActivityType,
    metadata: { skillSlug: 'javascript', skillName: 'JavaScript' },
    entityId: 'skill-1',
    entityType: 'skill',
    createdAt: new Date('2024-01-02'),
  }),
  createActivityRecord({
    id: 'activity-3',
    userId: 'user-3',
    type: 'RESUME_UPDATED' as ActivityType,
    metadata: { resumeId: 'resume-2', changes: ['title', 'summary'] },
    entityId: 'resume-2',
    entityType: 'resume',
    createdAt: new Date('2024-01-03'),
  }),
];
