/**
 * Validate Session Port (Inbound)
 *
 * Use-case interface for validating existing sessions.
 * Used by GET /auth/session to check if user is authenticated.
 */

import type { CookieReader } from '../../domain/ports/session-storage.port';
import type { SessionUserData } from './create-session.port';

export interface ValidateSessionCommand {
  cookieReader: CookieReader;
  /**
   * Optional userId — when provided, the use case skips cookie/JWT
   * verification and resolves the session payload directly from the
   * repository. Used by `/auth/session` to support callers that
   * authenticated through the pipeline JWT (Authorization header) but
   * have no session cookie.
   */
  userId?: string;
}

export interface ValidateSessionResult {
  success: boolean;
  user: SessionUserData | null;
}

export abstract class ValidateSessionPort {
  /**
   * Validates session cookie and returns user data if valid
   * @param command - Validation parameters with cookie reader
   * @returns User data or null if not authenticated
   */
  abstract execute(command: ValidateSessionCommand): Promise<ValidateSessionResult>;
}
