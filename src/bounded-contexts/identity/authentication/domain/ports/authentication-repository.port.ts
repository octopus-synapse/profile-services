/**
 * Authentication Repository Port
 *
 * Outbound port for authentication-related persistence operations.
 */

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

export abstract class AuthenticationRepositoryPort {
  /**
   * Finds a user by email with authentication data
   */
  abstract findUserByEmail(email: string): Promise<AuthUser | null>;

  /**
   * Finds a user by ID with authentication data
   */
  abstract findUserById(userId: string): Promise<AuthUser | null>;

  /**
   * Finds a user by ID with session-relevant data
   * Used for session cookie creation/validation
   */
  abstract findSessionUser(userId: string): Promise<SessionAuthUser | null>;

  /**
   * Stores a refresh token. `authMethod` identifies how the session was
   * authenticated (PASSWORD, 2FA_TOTP, 2FA_BACKUP_CODE, OAUTH_* ...) and is
   * surfaced to the user in the "Sessions" settings page.
   */
  abstract createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    authMethod?: string,
  ): Promise<void>;

  /**
   * Finds a refresh token
   */
  abstract findRefreshToken(token: string): Promise<RefreshTokenData | null>;

  /**
   * Deletes a specific refresh token
   */
  abstract deleteRefreshToken(token: string): Promise<void>;

  /**
   * Deletes all refresh tokens for a user
   */
  abstract deleteAllUserRefreshTokens(userId: string): Promise<void>;

  /**
   * Updates the last login timestamp
   */
  abstract updateLastLogin(userId: string): Promise<void>;

  /**
   * Invalidate session cache when user profile changes
   */
  abstract invalidateSessionCache(userId: string): Promise<void>;

  /**
   * Invalidate email cache when email changes
   */
  abstract invalidateEmailCache(email: string): Promise<void>;
}
