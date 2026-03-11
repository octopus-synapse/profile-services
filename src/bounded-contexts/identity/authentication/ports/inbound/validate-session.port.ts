/**
 * Validate Session Port (Inbound)
 *
 * Use-case interface for validating existing sessions.
 * Used by GET /auth/session to check if user is authenticated.
 */

import type { CookieReader } from '../outbound/session-storage.port';
import type { SessionUserData } from './create-session.port';

export interface ValidateSessionCommand {
  cookieReader: CookieReader;
}

export interface ValidateSessionResult {
  success: boolean;
  user: SessionUserData | null;
}

export interface ValidateSessionPort {
  /**
   * Validates session cookie and returns user data if valid
   * @param command - Validation parameters with cookie reader
   * @returns User data or null if not authenticated
   */
  execute(command: ValidateSessionCommand): Promise<ValidateSessionResult>;
}

export const VALIDATE_SESSION_PORT = Symbol('ValidateSessionPort');
