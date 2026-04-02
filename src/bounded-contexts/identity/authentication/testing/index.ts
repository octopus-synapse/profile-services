/**
 * Authentication Testing Module
 *
 * In-memory implementations for testing authentication features:
 * - Authentication repository (users, sessions, refresh tokens)
 * - Password hasher
 * - Token generator
 * - Session storage
 */

import type { SessionPayload } from '../domain/entities/session.entity';
import type {
  AuthenticationRepositoryPort,
  AuthUser,
  RefreshTokenData,
  SessionAuthUser,
} from '../domain/ports/authentication-repository.port';
import type { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import type {
  CookieReader,
  CookieWriter,
  SessionCookieOptions,
  SessionStoragePort,
} from '../domain/ports/session-storage.port';
import type {
  TokenGeneratorPort,
  TokenPair,
  TokenPayload,
} from '../domain/ports/token-generator.port';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY AUTHENTICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryAuthenticationRepository implements AuthenticationRepositoryPort {
  private users = new Map<string, AuthUser>();
  private sessionUsers = new Map<string, SessionAuthUser>();
  private refreshTokens = new Map<string, RefreshTokenData>();
  private emailIndex = new Map<string, string>(); // email -> userId

  // ───────────────────────────────────────────────────────────────
  // AuthenticationRepositoryPort Implementation
  // ───────────────────────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async findUserById(userId: string): Promise<AuthUser | null> {
    return this.users.get(userId) ?? null;
  }

  async findSessionUser(userId: string): Promise<SessionAuthUser | null> {
    return this.sessionUsers.get(userId) ?? null;
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    this.refreshTokens.set(token, {
      id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      token,
      expiresAt,
    });
  }

  async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    return this.refreshTokens.get(token) ?? null;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  async updateLastLogin(_userId: string): Promise<void> {
    // In memory - no-op for testing
  }

  async invalidateSessionCache(_userId: string): Promise<void> {
    // In memory - no-op for testing
  }

  async invalidateEmailCache(_email: string): Promise<void> {
    // In memory - no-op for testing
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  seedUser(user: AuthUser): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
  }

  seedSessionUser(user: SessionAuthUser): void {
    this.sessionUsers.set(user.id, user);
  }

  seedRefreshToken(data: RefreshTokenData): void {
    this.refreshTokens.set(data.token, data);
  }

  clear(): void {
    this.users.clear();
    this.sessionUsers.clear();
    this.refreshTokens.clear();
    this.emailIndex.clear();
  }

  getAllUsers(): AuthUser[] {
    return Array.from(this.users.values());
  }

  getAllRefreshTokens(): RefreshTokenData[] {
    return Array.from(this.refreshTokens.values());
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY PASSWORD HASHER
// ═══════════════════════════════════════════════════════════════

export class InMemoryPasswordHasher implements PasswordHasherPort {
  private hashMap = new Map<string, string>();

  async compare(password: string, hash: string): Promise<boolean> {
    // For in-memory testing, we store the original value
    const original = this.hashMap.get(hash);
    if (original) {
      return original === password;
    }
    // Fallback: check if hash matches our format
    return hash === `hashed:${password}`;
  }

  // Test helper to create a hash
  hash(password: string): string {
    const hash = `hashed:${password}`;
    this.hashMap.set(hash, password);
    return hash;
  }

  clear(): void {
    this.hashMap.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TOKEN GENERATOR
// ═══════════════════════════════════════════════════════════════

export class InMemoryTokenGenerator implements TokenGeneratorPort {
  private tokenCounter = 0;
  private accessTokens = new Map<string, TokenPayload>();
  private sessionTokens = new Map<string, SessionPayload>();

  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    this.tokenCounter++;
    const accessToken = `access_${this.tokenCounter}_${Date.now()}`;
    const refreshToken = `refresh_${this.tokenCounter}_${Date.now()}`;

    this.accessTokens.set(accessToken, payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  async generateSessionToken(payload: SessionPayload): Promise<string> {
    this.tokenCounter++;
    const sessionToken = `session_${this.tokenCounter}_${Date.now()}`;
    this.sessionTokens.set(sessionToken, payload);
    return sessionToken;
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const payload = this.accessTokens.get(token);
    if (!payload) {
      throw new Error('Invalid access token');
    }
    return payload;
  }

  async verifySessionToken(token: string): Promise<SessionPayload> {
    const payload = this.sessionTokens.get(token);
    if (!payload) {
      throw new Error('Invalid session token');
    }
    return payload;
  }

  generateRefreshToken(): string {
    this.tokenCounter++;
    return `refresh_${this.tokenCounter}_${Date.now()}`;
  }

  // Test helpers
  clear(): void {
    this.accessTokens.clear();
    this.sessionTokens.clear();
    this.tokenCounter = 0;
  }

  setValidAccessToken(token: string, payload: TokenPayload): void {
    this.accessTokens.set(token, payload);
  }

  setValidSessionToken(token: string, payload: SessionPayload): void {
    this.sessionTokens.set(token, payload);
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY SESSION STORAGE
// ═══════════════════════════════════════════════════════════════

export class InMemorySessionStorage implements SessionStoragePort {
  private cookieStore = new Map<string, string>();
  private readonly COOKIE_NAME = 'session';

  private readonly cookieOptions: SessionCookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  setSessionCookie(cookieWriter: CookieWriter, sessionToken: string, expiresAt: Date): void {
    // Store in memory
    this.cookieStore.set(this.COOKIE_NAME, sessionToken);
    // Also call the writer (for testing controllers)
    cookieWriter.setCookie(this.COOKIE_NAME, sessionToken, {
      ...this.cookieOptions,
      maxAge: expiresAt.getTime() - Date.now(),
    });
  }

  getSessionCookie(cookieReader: CookieReader): string | null {
    // Try reader first (for testing controllers)
    const fromReader = cookieReader.getCookie(this.COOKIE_NAME);
    if (fromReader) return fromReader;
    // Fallback to our store
    return this.cookieStore.get(this.COOKIE_NAME) ?? null;
  }

  clearSessionCookie(cookieWriter: CookieWriter): void {
    this.cookieStore.delete(this.COOKIE_NAME);
    cookieWriter.clearCookie(this.COOKIE_NAME, this.cookieOptions);
  }

  getCookieOptions(): SessionCookieOptions {
    return { ...this.cookieOptions };
  }

  // Test helpers
  clear(): void {
    this.cookieStore.clear();
  }

  hasCookie(name: string): boolean {
    return this.cookieStore.has(name);
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: 'test@example.com',
    passwordHash: 'hashed:password123',
    isActive: true,
    ...overrides,
  };
}

export function createSessionAuthUser(overrides: Partial<SessionAuthUser> = {}): SessionAuthUser {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    hasCompletedOnboarding: true,
    emailVerified: true,
    role: 'USER',
    roles: ['role_user'],
    ...overrides,
  };
}

export function createRefreshTokenData(
  overrides: Partial<RefreshTokenData> = {},
): RefreshTokenData {
  return {
    id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user-1',
    token: `refresh-${Date.now()}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_AUTH_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed:password123',
  isActive: true,
};

export const DEFAULT_SESSION_USER: SessionAuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  hasCompletedOnboarding: true,
  emailVerified: true,
  role: 'USER',
  roles: ['role_user'],
};
