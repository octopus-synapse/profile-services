/**
 * Session Invalidation Port
 *
 * Interface for invalidating user sessions after credential changes.
 * Ensures synchronous session invalidation within the use case,
 * avoiding race conditions with async event handlers.
 */

export interface SessionInvalidationPort {
  /**
   * Invalidates all sessions for a user.
   * - Sets the token_valid_after timestamp in Redis
   * - Deletes all refresh tokens from the database
   *
   * This operation must complete BEFORE returning to ensure
   * subsequent requests with old tokens are rejected.
   */
  invalidateAllSessions(userId: string): Promise<void>;
}

export const SESSION_INVALIDATION_PORT = Symbol('SessionInvalidationPort');
