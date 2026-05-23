/**
 * Security middleware for the Elysia bootstrap.
 *
 * `enableCors`: configureCors equivalent — installs the
 * `@elysiajs/cors` plugin with a strict origin policy. A wildcard
 * (`origin: '*'`) is allowed in development only; production refuses
 * unconfigured origins to avoid the OWASP A05:2021 misconfiguration
 * trap.
 *
 * V2 D43 (mobile): the allowlist accepts wildcard patterns
 * (`https://*.expo.dev`, `exp://*`). Strings containing `*` are
 * compiled to RegExp **internally** before being handed to
 * `@elysiajs/cors`, so the public `CorsOptions.origin` type stays the
 * P1 #11 strict `string | string[]` form — callers can't smuggle in a
 * raw `RegExp` (and a future refactor can't silently re-enable origin
 * reflection while `credentials: true` is set). Native deep-link
 * schemes (`patchcareers://`) don't trigger CORS at all (no Origin
 * header on native fetch) — they're only listed in the redirect-uri
 * allowlist. The `Accept-Mode` request header is now in the
 * allowed-headers list so mobile clients can opt into the token-body
 * login flow without preflight rejection.
 *
 * `applySecurityHeaders`: helmet-equivalent — sets the headers
 * helmet's defaults emit so the codebase passes the OWASP A05/A06
 * static-analysis checks even though we don't ship the `helmet`
 * package itself (helmet is Express-flavoured; Elysia handles
 * middleware natively).
 */

import { cors } from '@elysiajs/cors';
import type { Elysia } from 'elysia';

export interface CorsOptions {
  /** Explicit origin allowlist. P1 #11 — booleans (which echo back
   *  the caller's `Origin`) are intentionally rejected at the type
   *  level so a future refactor can't silently re-enable origin
   *  reflection while `credentials: true` is set. Strings may contain
   *  `*` wildcards (e.g. `https://*.expo.dev`) which are compiled to
   *  RegExp by `compileWildcardOrigins` before reaching the cors
   *  plugin — wildcards stay an internal implementation detail. */
  origin: string | string[];
  isProduction?: boolean;
}

/** Allowed request headers — kept as a named const so specs can import
 *  and assert membership without re-stating the list. */
export const ALLOWED_REQUEST_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-Id',
  // V2 D42: mobile flag to receive tokens in body instead of cookie.
  'Accept-Mode',
  // Locale negotiation (existing browser flow already includes it by
  // default, but explicit listing avoids stricter clients tripping
  // preflight when they advertise an Accept-Language other than the
  // browser default).
  'Accept-Language',
];

/**
 * Compile each entry in `origins`:
 *  - Plain string (no `*`) → passes through unchanged.
 *  - Wildcard string (contains `*`) → RegExp anchored end-to-end,
 *    case-insensitive. `*` matches one-or-more characters (including
 *    `/`). The literal prefix the operator writes is what guards
 *    against confusion attacks (`https://patchcareers.com.evil.com`).
 *
 * Internal helper — the public `CorsOptions.origin` type is
 * `string | string[]` so callers never construct RegExps themselves.
 */
export function compileWildcardOrigins(origins: string[]): Array<string | RegExp> {
  return origins.map((entry) => {
    if (!entry.includes('*')) return entry;
    const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+');
    return new RegExp(`^${escaped}$`, 'i');
  });
}

/**
 * Wires CORS onto the Elysia app. Throws on misconfigured wildcard in
 * production so deploys fail fast instead of leaking origins.
 *
 * A bare `*` string (matches everything) is still rejected in
 * production — pattern-based wildcards (`https://*.expo.dev`) are
 * allowed everywhere because they're bounded by the literal prefix.
 */
export function enableCors(app: Elysia, options: CorsOptions): void {
  const originList = Array.isArray(options.origin) ? options.origin : [options.origin];
  if (options.isProduction && originList.some((o) => o === '*')) {
    throw new Error('CORS misconfiguration: wildcard origin is forbidden in production');
  }
  const compiled = compileWildcardOrigins(originList);
  app.use(
    cors({
      origin: compiled,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ALLOWED_REQUEST_HEADERS,
      maxAge: 600,
    }),
  );
}

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  // Prevent MIME sniffing.
  'X-Content-Type-Options': 'nosniff',
  // Disallow framing — clickjacking guard.
  'X-Frame-Options': 'DENY',
  // Force HTTPS for one year on HSTS-aware clients.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Restrict referrer leakage to cross-origin destinations.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Restrict powerful browser APIs (camera/microphone/geolocation).
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Default Content-Security-Policy. Routes that need to relax it
  // (e.g., admin docs UI) can override per-handler via response headers.
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'",
};

/**
 * Applies the security-header bundle on every response. Acts as the
 * helmet-equivalent for Elysia.
 */
export function applySecurityHeaders(app: Elysia): void {
  app.onAfterHandle(({ set }) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      // Don't clobber a header a handler explicitly set on its way out.
      if (set.headers[name] === undefined) {
        set.headers[name] = value;
      }
    }
  });
}
