/**
 * Session Storage Port (Outbound)
 *
 * Abstraction for session cookie storage.
 * Implementations handle the actual cookie read/write operations.
 *
 * This follows the Ports & Adapters pattern - the use case depends
 * on this abstraction, not on HTTP Response/cookies directly.
 *
 * Note: Uses generic object types instead of Express types to maintain
 * Clean Architecture boundaries. The adapter (infrastructure layer)
 * is responsible for interpreting these as Express Request/Response.
 */

/**
 * Cookie writer abstraction - implemented by infrastructure
 * Wraps HTTP response cookie functionality
 */
export interface CookieWriter {
  setCookie(name: string, value: string, options: SessionCookieOptions): void;
  clearCookie(name: string, options: Partial<SessionCookieOptions>): void;
}

/**
 * Cookie reader abstraction - implemented by infrastructure
 * Wraps HTTP request cookie functionality
 */
export interface CookieReader {
  getCookie(name: string): string | undefined;
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  domain?: string;
}

export interface SessionStoragePort {
  /**
   * Set session cookie with security options (httpOnly, secure, sameSite)
   * @param cookieWriter - Abstraction for writing cookies
   * @param sessionToken - JWT session token to store
   * @param expiresAt - Cookie expiration date
   */
  setSessionCookie(cookieWriter: CookieWriter, sessionToken: string, expiresAt: Date): void;

  /**
   * Read session cookie from request
   * @param cookieReader - Abstraction for reading cookies
   * @returns Session token string or null if not found
   */
  getSessionCookie(cookieReader: CookieReader): string | null;

  /**
   * Clear session cookie (logout)
   * @param cookieWriter - Abstraction for writing cookies
   */
  clearSessionCookie(cookieWriter: CookieWriter): void;

  /**
   * Get cookie options for configuration/testing
   */
  getCookieOptions(): SessionCookieOptions;
}

export const SESSION_STORAGE_PORT = Symbol('SessionStoragePort');
