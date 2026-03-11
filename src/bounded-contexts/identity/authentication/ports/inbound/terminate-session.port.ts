/**
 * Terminate Session Port (Inbound)
 *
 * Use-case interface for terminating sessions (logout).
 * Clears the session cookie and optionally invalidates refresh tokens.
 */

import type { CookieReader, CookieWriter } from '../outbound/session-storage.port';

export interface TerminateSessionCommand {
  cookieReader: CookieReader;
  cookieWriter: CookieWriter;
  terminateAllSessions?: boolean;
}

export interface TerminateSessionResult {
  success: boolean;
  message: string;
}

export interface TerminateSessionPort {
  /**
   * Terminates session by clearing cookie and optionally all refresh tokens
   * @param command - Termination parameters with cookie abstractions
   * @returns Success status and message
   */
  execute(command: TerminateSessionCommand): Promise<TerminateSessionResult>;
}

export const TERMINATE_SESSION_PORT = Symbol('TerminateSessionPort');
