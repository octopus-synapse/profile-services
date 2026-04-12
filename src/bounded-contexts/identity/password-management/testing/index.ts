/**
 * Password Management Testing Module
 *
 * In-memory implementations for testing password management features:
 * - Password repository
 * - Password hasher
 * - Token service
 * - Email sender
 */

import type {
  PasswordHasherPort,
  PasswordRepositoryPort,
  PasswordResetEmailPort,
  PasswordResetTokenPort,
  SessionInvalidationPort,
  UserWithPassword,
} from '../domain/ports';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY PASSWORD REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryPasswordRepository implements PasswordRepositoryPort {
  private users = new Map<string, UserWithPassword>();
  private emailIndex = new Map<string, string>(); // email -> userId

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const userId = this.emailIndex.get(email);
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async findById(userId: string): Promise<UserWithPassword | null> {
    return this.users.get(userId) ?? null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, passwordHash });
    }
  }

  // Test helpers
  seedUser(user: UserWithPassword): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }

  getAllUsers(): UserWithPassword[] {
    return Array.from(this.users.values());
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY PASSWORD HASHER
// ═══════════════════════════════════════════════════════════════

export class InMemoryPasswordHasher implements PasswordHasherPort {
  private hashMap = new Map<string, string>();

  async hash(password: string): Promise<string> {
    const hash = `hashed:${password}`;
    this.hashMap.set(hash, password);
    return hash;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    // For in-memory testing, we store the original value
    const original = this.hashMap.get(hash);
    if (original) {
      return original === password;
    }
    // Fallback: check if hash matches our format
    return hash === `hashed:${password}`;
  }

  // Test helper
  clear(): void {
    this.hashMap.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TOKEN SERVICE
// ═══════════════════════════════════════════════════════════════

interface TokenRecord {
  userId: string;
  token: string;
  expiresAt: Date;
}

export class InMemoryTokenService implements PasswordResetTokenPort {
  private tokens = new Map<string, TokenRecord>();

  async createToken(userId: string, token: string): Promise<void> {
    // Delete any existing tokens for this user
    for (const [key, record] of this.tokens.entries()) {
      if (record.userId === userId) {
        this.tokens.delete(key);
      }
    }

    // Create new token (24 hours expiration)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    this.tokens.set(token, { userId, token, expiresAt });
  }

  async validateToken(token: string): Promise<string> {
    const record = this.tokens.get(token);
    if (!record) {
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > record.expiresAt) {
      this.tokens.delete(token);
      throw new Error('Invalid or expired reset token');
    }

    return record.userId;
  }

  async validateAndConsumeToken(token: string): Promise<string> {
    const record = this.tokens.get(token);
    if (!record) {
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > record.expiresAt) {
      this.tokens.delete(token);
      throw new Error('Invalid or expired reset token');
    }

    // Atomically consume the token
    this.tokens.delete(token);
    return record.userId;
  }

  async invalidateToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  // Test helpers
  clear(): void {
    this.tokens.clear();
  }

  getAllTokens(): TokenRecord[] {
    return Array.from(this.tokens.values());
  }

  hasToken(token: string): boolean {
    return this.tokens.has(token);
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY EMAIL SENDER
// ═══════════════════════════════════════════════════════════════

interface EmailRecord {
  to: string;
  userName: string | null;
  resetToken: string;
  sentAt: Date;
}

export class InMemoryEmailSender implements PasswordResetEmailPort {
  private sentEmails: EmailRecord[] = [];

  async sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void> {
    this.sentEmails.push({
      to: email,
      userName,
      resetToken,
      sentAt: new Date(),
    });
  }

  // Test helpers
  clear(): void {
    this.sentEmails = [];
  }

  getSentEmails(): EmailRecord[] {
    return [...this.sentEmails];
  }

  getLastSentEmail(): EmailRecord | null {
    return this.sentEmails[this.sentEmails.length - 1] ?? null;
  }

  wasEmailSentTo(email: string): boolean {
    return this.sentEmails.some((e) => e.to === email);
  }

  getEmailCount(): number {
    return this.sentEmails.length;
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY SESSION INVALIDATION
// ═══════════════════════════════════════════════════════════════

export class InMemorySessionInvalidation implements SessionInvalidationPort {
  private invalidatedUsers: string[] = [];

  async invalidateAllSessions(userId: string): Promise<void> {
    this.invalidatedUsers.push(userId);
  }

  // Test helpers
  clear(): void {
    this.invalidatedUsers = [];
  }

  getInvalidations(): string[] {
    return [...this.invalidatedUsers];
  }

  wasInvalidated(userId: string): boolean {
    return this.invalidatedUsers.includes(userId);
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createUserWithPassword(
  overrides: Partial<UserWithPassword> = {},
): UserWithPassword {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: `user${Date.now()}@example.com`,
    name: 'Test User',
    passwordHash: 'hashed:password123',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_USER: UserWithPassword = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed:password123',
};

export const DEFAULT_USER_NO_PASSWORD: UserWithPassword = {
  id: 'user-2',
  email: 'nopass@example.com',
  name: 'No Password User',
  passwordHash: '',
};
