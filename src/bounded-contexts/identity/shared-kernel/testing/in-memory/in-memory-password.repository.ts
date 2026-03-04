/**
 * In-Memory Password Repository
 *
 * Fake implementation for testing password operations.
 */

import type {
  PasswordRepositoryPort,
  UserWithPassword,
} from '../../../password-management/ports/outbound/password-repository.port';

export class InMemoryPasswordRepository implements PasswordRepositoryPort {
  private users: Map<string, UserWithPassword> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async findById(userId: string): Promise<UserWithPassword | null> {
    return this.users.get(userId) ?? null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
    }
  }

  // Test helpers
  seedUser(user: UserWithPassword): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
  }

  getUser(userId: string): UserWithPassword | undefined {
    return this.users.get(userId);
  }

  getUserByEmail(email: string): UserWithPassword | undefined {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  getAllUsers(): UserWithPassword[] {
    return [...this.users.values()];
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}
