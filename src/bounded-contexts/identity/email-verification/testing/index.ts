/**
 * Email Verification Testing Module
 *
 * In-memory implementations for testing email verification features:
 * - Email verification repository
 * - Verification email sender
 */

import type {
  EmailVerificationRepositoryPort,
  UserVerificationStatus,
  VerificationEmailSenderPort,
  VerificationTokenData,
} from '../domain/ports';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY EMAIL VERIFICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryEmailVerificationRepository implements EmailVerificationRepositoryPort {
  private users = new Map<string, { id: string; email: string; emailVerified: boolean }>();
  private tokens: Array<{
    userId: string;
    token: string;
    expiresAt: Date;
    email: string;
    createdAt: Date;
  }> = [];

  // ───────────────────────────────────────────────────────────────
  // EmailVerificationRepositoryPort Implementation
  // ───────────────────────────────────────────────────────────────

  async findUserById(userId: string): Promise<UserVerificationStatus | null> {
    const user = this.users.get(userId);
    return user ?? null;
  }

  async findUserByEmail(email: string): Promise<UserVerificationStatus | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
  ): Promise<void> {
    this.tokens.push({
      userId,
      token,
      expiresAt,
      email,
      createdAt: new Date(),
    });
  }

  async findVerificationToken(token: string): Promise<VerificationTokenData | null> {
    const tokenRecord = this.tokens.find((t) => t.token === token);
    if (!tokenRecord) {
      return null;
    }
    return {
      userId: tokenRecord.userId,
      token: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  async deleteVerificationToken(token: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.token !== token);
  }

  async deleteUserVerificationTokens(userId: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.userId !== userId);
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.emailVerified = true;
    }
  }

  async hasRecentToken(userId: string, withinMinutes: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.tokens.some((t) => t.userId === userId && t.createdAt >= cutoff);
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seedUser(userId: string, email: string, emailVerified = false): void {
    this.users.set(userId, { id: userId, email, emailVerified });
  }

  seedToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
    createdAt = new Date(),
  ): void {
    this.tokens.push({ userId, token, expiresAt, email, createdAt });
  }

  clear(): void {
    this.users.clear();
    this.tokens = [];
  }

  getAllUsers(): UserVerificationStatus[] {
    return Array.from(this.users.values());
  }

  getAllTokens(): VerificationTokenData[] {
    return this.tokens.map((t) => ({
      userId: t.userId,
      token: t.token,
      expiresAt: t.expiresAt,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY VERIFICATION EMAIL SENDER
// ═══════════════════════════════════════════════════════════════

export class InMemoryVerificationEmailSender implements VerificationEmailSenderPort {
  private sentEmails: Array<{
    email: string;
    userName: string | null;
    verificationToken: string;
    sentAt: Date;
  }> = [];

  async sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
  ): Promise<void> {
    this.sentEmails.push({
      email,
      userName,
      verificationToken,
      sentAt: new Date(),
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1] ?? null;
  }

  clear(): void {
    this.sentEmails = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createUserVerificationStatus(
  overrides: Partial<UserVerificationStatus> = {},
): UserVerificationStatus {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: 'test@example.com',
    emailVerified: false,
    ...overrides,
  };
}

export function createVerificationTokenData(
  overrides: Partial<VerificationTokenData> = {},
): VerificationTokenData {
  return {
    userId: 'user-1',
    token: `token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_USER: UserVerificationStatus = {
  id: 'user-1',
  email: 'test@example.com',
  emailVerified: false,
};

export const DEFAULT_VERIFIED_USER: UserVerificationStatus = {
  id: 'user-2',
  email: 'verified@example.com',
  emailVerified: true,
};

export const DEFAULT_TOKEN: VerificationTokenData = {
  userId: 'user-1',
  token: 'valid-token-123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
};

export const DEFAULT_EXPIRED_TOKEN: VerificationTokenData = {
  userId: 'user-1',
  token: 'expired-token-456',
  expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
};
