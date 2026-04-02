/**
 * In-Memory User Management Repository for Testing
 *
 * Extends UserManagementRepositoryPort abstract class with in-memory storage.
 * Provides helper methods for test setup and assertions.
 */

import { UserManagementRepositoryPort } from '../../../users/application/ports/user-management.port';
import type {
  CreatedUser,
  UpdatedUser,
  UpdateUserData,
  UserDetails,
  UserListItem,
  UserListOptions,
} from '../../../users/domain/types';

interface StoredUser {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
  image: string | null;
  emailVerified: Date | null;
  passwordHash: string | null;
  role: 'USER' | 'ADMIN';
  lastLoginAt: Date | null;
  resumes: {
    id: string;
    title: string | null;
    template: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  preferences: unknown | null;
  counts: {
    accounts: number;
    sessions: number;
    resumes: number;
  };
}

export class InMemoryUserManagementRepository extends UserManagementRepositoryPort {
  private users = new Map<string, StoredUser>();

  // ============ Test Helpers ============

  /**
   * Seed a user for testing
   */
  seedUser(user: Partial<StoredUser> & { id: string }): void {
    const now = new Date();
    const fullUser: StoredUser = {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      username: user.username ?? null,
      hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? now,
      image: user.image ?? null,
      emailVerified: user.emailVerified ?? null,
      passwordHash: user.passwordHash ?? null,
      role: user.role ?? 'USER',
      lastLoginAt: user.lastLoginAt ?? null,
      resumes: user.resumes ?? [],
      preferences: user.preferences ?? null,
      counts: user.counts ?? { accounts: 0, sessions: 0, resumes: 0 },
    };
    this.users.set(user.id, fullUser);
  }

  /**
   * Get a user by ID
   */
  getUser(userId: string): StoredUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Get all seeded users
   */
  getAllUsers(): StoredUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Clear all users
   */
  clear(): void {
    this.users.clear();
  }

  // ============ Repository Port Implementation ============

  async findUsers(options: UserListOptions): Promise<{
    users: UserListItem[];
    total: number;
  }> {
    const { page, limit, search } = options;
    let filteredUsers = Array.from(this.users.values());

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.email?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower) ||
          u.username?.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredUsers.length;
    const skip = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    const users: UserListItem[] = paginatedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      username: u.username,
      hasCompletedOnboarding: u.hasCompletedOnboarding,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      image: u.image,
      emailVerified: u.emailVerified,
      resumeCount: u.counts.resumes,
      role: u.role,
      lastLoginAt: u.lastLoginAt,
    }));

    return { users, total };
  }

  async findUserById(userId: string): Promise<{ id: string } | null> {
    const user = this.users.get(userId);
    return user ? { id: user.id } : null;
  }

  async findUserDetails(userId: string): Promise<UserDetails | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      image: user.image,
      emailVerified: user.emailVerified,
      resumes: user.resumes,
      preferences: user.preferences,
      counts: user.counts,
    };
  }

  async createUser(data: {
    email: string;
    hashedPassword: string;
    name?: string;
  }): Promise<CreatedUser> {
    const id = `user-${Date.now()}`;
    const now = new Date();
    const user: StoredUser = {
      id,
      email: data.email,
      name: data.name ?? null,
      username: null,
      hasCompletedOnboarding: false,
      createdAt: now,
      updatedAt: now,
      image: null,
      emailVerified: null,
      passwordHash: data.hashedPassword,
      role: 'USER',
      lastLoginAt: null,
      resumes: [],
      preferences: null,
      counts: { accounts: 0, sessions: 0, resumes: 0 },
    };
    this.users.set(id, user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async updateUser(userId: string, data: UpdateUserData): Promise<UpdatedUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const now = new Date();
    if (data.email !== undefined) user.email = data.email;
    if (data.name !== undefined) user.name = data.name;
    if (data.username !== undefined) user.username = data.username;
    user.updatedAt = now;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      updatedAt: user.updatedAt,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async resetUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = hashedPassword;
      user.updatedAt = new Date();
    }
  }
}
