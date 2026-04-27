/**
 * Aggregated HTTP-facing bundle for the authentication BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. Today only the refresh-token endpoint is expressed
 * as a `Route` descriptor; the rest of the authentication controllers
 * stay Nest-decorated because they need `Request`/`Response` access
 * (cookie read/write), `@AllowUnverifiedEmail()`, or `RateLimitGuard`
 * — none of which the synthesizer models yet.
 *
 * The wiring lives in `authentication.module.ts` (`useFactory`).
 */

import type { RefreshTokenPort } from './refresh-token.port';

export abstract class AuthenticationHttpBundle {
  abstract readonly refreshToken: RefreshTokenPort;
}
