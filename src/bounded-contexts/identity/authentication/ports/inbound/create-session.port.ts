/**
 * Create Session Port (Inbound)
 *
 * Use-case interface for creating authenticated sessions.
 * Called after successful login to establish cookie-based session.
 */

import type { CookieWriter } from '../outbound/session-storage.port';

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
}

export interface CreateSessionResult {
  success: boolean;
  user: SessionUserData;
}

export interface CreateSessionPort {
  /**
   * Creates a new session and sets httpOnly cookie
   * @param command - Session creation parameters with cookie writer
   * @returns User data for immediate client use
   */
  execute(command: CreateSessionCommand): Promise<CreateSessionResult>;
}

export const CREATE_SESSION_PORT = Symbol('CreateSessionPort');
