/**
 * Authentication Repository Port
 *
 * Outbound port for authentication-related persistence operations.
 */

export const AUTHENTICATION_REPOSITORY_PORT = Symbol('AuthenticationRepositoryPort');

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
}

/**
 * User data returned for session-based auth
 * Contains minimal auth-relevant data for the frontend
 */
export interface SessionAuthUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  emailVerified: boolean;
  role: string;
  roles: string[];
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  authMethod?: string | null;
}

export interface AuthenticationRepositoryPort {
  /**
   * Finds a user by email with authentication data
   */
  findUserByEmail(email: string): Promise<AuthUser | null>;

  /**
   * Finds a user by ID with authentication data
   */
  findUserById(userId: string): Promise<AuthUser | null>;

  /**
   * Finds a user by ID with session-relevant data
   * Used for session cookie creation/validation
   */
  findSessionUser(userId: string): Promise<SessionAuthUser | null>;

  /**
   * Stores a refresh token. `authMethod` identifies how the session was
   * authenticated (PASSWORD, 2FA_TOTP, 2FA_BACKUP_CODE, OAUTH_* ...) and is
   * surfaced to the user in the "Sessions" settings page.
   */
  createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    authMethod?: string,
  ): Promise<void>;

  /**
   * Finds a refresh token
   */
  findRefreshToken(token: string): Promise<RefreshTokenData | null>;

  /**
   * Deletes a specific refresh token
   */
  deleteRefreshToken(token: string): Promise<void>;

  /**
   * Deletes all refresh tokens for a user
   */
  deleteAllUserRefreshTokens(userId: string): Promise<void>;

  /**
   * Updates the last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Invalidate session cache when user profile changes
   */
  invalidateSessionCache(userId: string): Promise<void>;

  /**
   * Invalidate email cache when email changes
   */
  invalidateEmailCache(email: string): Promise<void>;
}
