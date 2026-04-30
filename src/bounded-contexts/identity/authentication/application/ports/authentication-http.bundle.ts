/**
 * Aggregated HTTP-facing bundle for the authentication BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. Every authentication endpoint — login (with 2FA),
 * logout, refresh, session lookup, device listing/revocation — is now
 * a `Route` descriptor; this bundle aggregates the inbound ports plus
 * the abstract `SessionDevicePort` (implemented by the Nest-side
 * `SessionDeviceService`) so the synthesized controllers only ever
 * depend on this one token.
 *
 * The wiring lives in `authentication.module.ts` (`useFactory`).
 */

import type { CreateSessionPort } from './create-session.port';
import type { LoginPort } from './login.port';
import type { LogoutPort } from './logout.port';
import type { RefreshTokenPort } from './refresh-token.port';
import type { SessionDevicePort } from './session-device.port';
import type { TerminateSessionPort } from './terminate-session.port';
import type { ValidateSessionPort } from './validate-session.port';

export abstract class AuthenticationHttpBundle {
  abstract readonly login: LoginPort;
  abstract readonly logout: LogoutPort;
  abstract readonly createSession: CreateSessionPort;
  abstract readonly validateSession: ValidateSessionPort;
  abstract readonly terminateSession: TerminateSessionPort;
  abstract readonly refreshToken: RefreshTokenPort;
  abstract readonly sessionDevices: SessionDevicePort;
}
