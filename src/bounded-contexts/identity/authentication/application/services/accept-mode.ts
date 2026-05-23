/**
 * V2 D42: `Accept-Mode` header lets a client opt out of the legacy
 * cookie-based session and receive the access/refresh tokens in the
 * response body instead. Designed for the Expo / RN mobile app where
 * cookies are awkward (no shared `document.cookie`, secure storage
 * handles tokens explicitly).
 *
 * Values:
 *  - `tokens` → return tokens in body, do NOT set Set-Cookie
 *  - `cookie` (or absent) → legacy behaviour: Set-Cookie, body omits tokens
 *
 * The decision is read-only at the route handler boundary — no domain
 * port shift, no session-storage refactor; just a presentation tweak.
 */

import type { HttpCtx } from '@/shared-kernel/http/context';

export type AcceptMode = 'tokens' | 'cookie';

export function readAcceptMode(ctx: HttpCtx): AcceptMode {
  const raw = ctx.headers['accept-mode'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return 'cookie';
  return value.trim().toLowerCase() === 'tokens' ? 'tokens' : 'cookie';
}
