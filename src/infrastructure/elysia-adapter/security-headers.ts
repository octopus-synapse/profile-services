/**
 * Security middleware for the Elysia bootstrap.
 *
 * `enableCors`: configureCors equivalent — installs the
 * `@elysiajs/cors` plugin with a strict origin policy. A wildcard
 * (`origin: '*'`) is allowed in development only; production refuses
 * unconfigured origins to avoid the OWASP A05:2021 misconfiguration
 * trap.
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
  /** Origin allowlist, or `true` to mirror the requesting origin. */
  origin: string | string[] | boolean;
  isProduction?: boolean;
}

/**
 * Wires CORS onto the Elysia app. Throws on misconfigured wildcard in
 * production so deploys fail fast instead of leaking origins.
 */
export function enableCors(app: Elysia, options: CorsOptions): void {
  if (
    options.isProduction &&
    (options.origin === '*' || (Array.isArray(options.origin) && options.origin.includes('*')))
  ) {
    throw new Error('CORS misconfiguration: wildcard origin is forbidden in production');
  }
  app.use(
    cors({
      origin: options.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
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
