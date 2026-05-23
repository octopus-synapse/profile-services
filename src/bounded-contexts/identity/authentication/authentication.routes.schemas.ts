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
import { IdParamSchema } from '@/shared-kernel/schemas/params';

export const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1).optional() }).openapi({
  example: {
    refreshToken: 'fixture-refresh-token-aaaaaaaaaaaaaaaa',
  },
});
export const LogoutSchema = z
  .object({
    refreshToken: z.string().optional(),
    logoutAllSessions: z.boolean().default(false),
  })
  .openapi({
    example: {
      logoutAllSessions: false,
    },
  });
export const RevokeSessionParams = IdParamSchema;

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

// Server-to-server clients with explicit `refreshToken` body get the
// `tokens` shape; browser clients get the `cookie` shape. Discriminated
// on `mode` so the spec carries an explicit shape per case.
export const RefreshResponseSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('tokens'),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  }),
  z.object({
    mode: z.literal('cookie'),
    ok: z.literal(true),
  }),
]);

// Login returns `{userId, twoFactorRequired}` — the literal value of
// `twoFactorRequired` discriminates the 2FA-challenge variant from the
// session-issued variant. V2 D42: native clients (Accept-Mode: tokens)
// also receive a one-shot `sessionExchangeId` they immediately swap for
// a token pair via `POST /v1/auth/session/tokens`. The field is optional
// because cookie clients never receive it.
export const LoginResponseSchema = z.discriminatedUnion('twoFactorRequired', [
  z
    .object({
      userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
      twoFactorRequired: z.literal(true),
    })
    .openapi({
      example: { userId: '550e8400-e29b-41d4-a716-446655440000', twoFactorRequired: true },
    }),
  z
    .object({
      userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
      twoFactorRequired: z.literal(false),
      sessionExchangeId: z.string().optional().openapi({ example: 'sxc_abc123def456' }),
    })
    .openapi({
      example: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        twoFactorRequired: false,
        sessionExchangeId: 'sxc_abc123def456',
      },
    }),
]);

export const Verify2faResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    sessionExchangeId: z.string().optional().openapi({ example: 'sxc_abc123def456' }),
  })
  .openapi({
    example: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      sessionExchangeId: 'sxc_abc123def456',
    },
  });

// V2 D42 — POST /v1/auth/session/tokens body + response.
export const SessionTokensRequestSchema = z
  .object({
    sessionExchangeId: z.string().min(1).openapi({ example: 'sxc_abc123def456' }),
  })
  .openapi({ example: { sessionExchangeId: 'sxc_abc123def456' } });

export const SessionTokensResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fixture' }),
    refreshToken: z.string().openapi({ example: 'rt_eyJhbGciOiJIUzI1NiJ9.fixture' }),
    expiresIn: z.number().openapi({ example: 900 }),
  })
  .openapi({
    example: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fixture',
      refreshToken: 'rt_eyJhbGciOiJIUzI1NiJ9.fixture',
      expiresIn: 900,
    },
  });

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
