/**
 * Route descriptors for the authentication BC.
 *
 * Auth is **cookie-only** for browser clients (T9):
 *   - Login / verify-2fa write the session cookie via `ctxCookieWriter(ctx)`
 *     and return *only* `{userId}` (or `{userId, twoFactorRequired:true}`).
 *   - Refresh and logout read the session cookie via `ctxCookieReader(ctx)`.
 *   - Server-to-server clients can still pass `refreshToken` in the body
 *     (kept for compatibility with non-browser callers).
 *
 * Pipeline glue:
 *   - Cookie writes are staged via `ctxCookieWriter(ctx)` (which writes
 *     into `ctx.state.__cookieJar`); the synthesizer flushes the jar
 *     onto the response after the handler returns.
 *   - The 2FA verify endpoint declares
 *     `route.guards: [{ id: 'rate-limit', metadata: { points: 5, ... } }]`
 *     — the registry maps this to `RateLimitGuard`.
 *   - The logout endpoint uses
 *     `route.guards: [{ id: 'allow-unverified-email' }]` so the global
 *     `EmailVerifiedGuard` short-circuits.
 */

import { z } from 'zod';

export const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1).optional() });
export const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutAllSessions: z.boolean().default(false),
});
export const RevokeSessionParams = z.object({ id: z.string() });

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  emailVerified: z.boolean().nullable().optional(),
  role: z.enum(['USER', 'ADMIN']),
  roles: z.array(z.string()),
  isAdmin: z.boolean(),
  needsOnboarding: z.boolean(),
  needsEmailVerification: z.boolean(),
});

export const SessionResponseSchema = z.object({
  user: SessionUserSchema,
});

// Server-to-server clients with explicit `refreshToken` body get the legacy
// token shape; browser clients get `{ ok: true }`. Either is acceptable.
export const RefreshResponseSchema = z.union([
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  }),
  z.object({ ok: z.literal(true) }),
]);

export const LoginResponseSchema = z.union([
  z.object({ userId: z.string(), twoFactorRequired: z.literal(true) }),
  z.object({ userId: z.string() }),
]);

export const Verify2faResponseSchema = z.object({ userId: z.string() });

export const LogoutResponseSchema = z.object({ message: z.string() });

export const SessionDeviceSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  deviceName: z.string().nullable(),
  authMethod: z.string().nullable(),
  revoked: z.boolean(),
});

export const ListSessionsResponseSchema = z.object({ sessions: z.array(SessionDeviceSchema) });

export const RevokeSessionResponseSchema = z.object({ revoked: z.literal(true) });
