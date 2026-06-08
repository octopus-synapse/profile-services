/**
 * Create Session Port (Inbound)
 *
 * Use-case interface for creating authenticated sessions.
 * Called after successful login to establish cookie-based session.
 */

import type { CookieWriter } from '../../domain/ports/session-storage.port';

/**
 * User data returned after session creation
 * Minimal auth-relevant data for the frontend
 */
export interface SessionUserData {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  emailVerified: boolean;
  role: 'USER' | 'ADMIN';
  roles: string[];
  // Calculated fields - frontend should NOT calculate these
  isAdmin: boolean;
  needsOnboarding: boolean;
  needsEmailVerification: boolean;
}

export interface CreateSessionCommand {
  userId: string;
  email: string;
  cookieWriter: CookieWriter;
  ipAddress?: string;
  userAgent?: string;
  /**
   * "Keep me signed in" (web). True → persistent cookie sized to
   * `PERSISTENT_SESSION_EXPIRY_DAYS`; false/absent → session cookie sized to
   * `SESSION_EXPIRY_DAYS` that dies on browser close. Mobile (Accept-Mode:
   * tokens) suppresses the cookie entirely, so this is a no-op there.
   */
  keepSignedIn?: boolean;
}

export interface CreateSessionResult {
  success: boolean;
  user: SessionUserData;
}

export abstract class CreateSessionPort {
  /**
   * Creates a new session and sets httpOnly cookie
   * @param command - Session creation parameters with cookie writer
   * @returns User data for immediate client use
   */
  abstract execute(command: CreateSessionCommand): Promise<CreateSessionResult>;
}
