/**
 * Renew Session Port (Inbound)
 *
 * Slides a browser cookie session: given a still-valid `access_token`
 * cookie, re-issue a fresh one with a new expiry window, preserving the
 * original `persistent` ("keep me signed in") choice. This is the
 * browser counterpart to the mobile token rotation — the frontend calls
 * `POST /v1/auth/refresh` (no body) on app load to keep the window alive.
 *
 * No event / no DB write: this is a pure cookie re-mint, not a new login,
 * so it must NOT fire `SessionCreatedEvent` (that would spam the device
 * list on every refresh).
 */

import type { CookieReader, CookieWriter } from '../../domain/ports/session-storage.port';

export interface RenewSessionCommand {
  cookieReader: CookieReader;
  cookieWriter: CookieWriter;
}

export interface RenewSessionResult {
  /** True when a valid cookie was found and a fresh one was written. */
  renewed: boolean;
}

export abstract class RenewSessionPort {
  abstract execute(command: RenewSessionCommand): Promise<RenewSessionResult>;
}
