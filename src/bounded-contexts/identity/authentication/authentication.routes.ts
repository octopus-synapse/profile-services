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
import { Permission } from '@/shared-kernel/authorization';
import { UnauthorizedException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route.types';
import { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import { ctxCookieReader, ctxCookieWriter } from './application/services/ctx-cookie-bridge';
import { LoginSchema, LoginVerify2faSchema } from './application/use-cases/login/login.schema';
import {
  ListSessionsResponseSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  LogoutSchema,
  RefreshResponseSchema,
  RefreshTokenSchema,
  RevokeSessionParams,
  SessionResponseSchema,
  Verify2faResponseSchema,
} from './authentication.routes.schemas';

export const authenticationRoutes: ReadonlyArray<Route<AuthenticationHttpBundle>> = [
  {
    method: 'POST',
    path: '/v1/auth/refresh',
    auth: { kind: 'public' },
    body: RefreshTokenSchema,
    response: RefreshResponseSchema,
    guards: [
      // P0-#4: refresh is brute-forceable by an attacker who steals a near-
      // expired refresh token and tries to roll it; cap per IP.
      { id: 'rate-limit', metadata: { points: 30, duration: 60, keyStrategy: 'ip' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Refresh access token',
      tags: ['auth'],
      description:
        'Rolls the session cookie. Body `refreshToken` is optional and used only by non-browser clients.',
    },
    sdk: { exported: true, name: 'refresh' },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof RefreshTokenSchema>;
      // Browser flow: cookie carries the refresh token; backend rotates it
      // silently. We return only `{ok: true}` so the frontend never sees
      // the token. Non-browser clients with an explicit body receive the
      // legacy token shape for compatibility.
      if (body.refreshToken) {
        const result = await bc.refreshToken.execute({ refreshToken: body.refreshToken });
        return {
          mode: 'tokens' as const,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        };
      }
      return { mode: 'cookie' as const, ok: true as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/login',
    auth: { kind: 'public' },
    body: LoginSchema,
    statusCode: 200,
    response: LoginResponseSchema,
    guards: [
      // P0-#4: lockout is per-email (5/15min); without an IP cap an attacker
      // can probe many emails in parallel from the same IP without ever
      // tripping the lock. The IP budget here is intentionally moderate
      // (not aggressive): an attacker behind a single IP is also blocked
      // by the per-email lockout after 5 failed tries on any given account,
      // so the per-IP cap mainly slows down horizontal sweeps (one IP
      // probing many emails) — 30/minute is plenty to make that
      // impractical (43k/day) while leaving headroom for the contract
      // test pool (3 specs × 3 personas + 1 mutation probe ≈ 10/run,
      // multiplied by retries/parallel boots) so CI doesn't 429 itself.
      { id: 'rate-limit', metadata: { points: 30, duration: 60, keyStrategy: 'ip' } },
      // P1 #2 — pipeline-level fast-path: a locked email reaches the
      // login handler today only to throw `AccountLockedException`
      // from the use-case. The stage rejects with 423 + Retry-After
      // before the request even hits the use-case so an attacker
      // spraying a locked account can't sustain DB hits / bcrypt churn.
      { id: 'auth-lockout', metadata: { keyStrategy: 'email' } },
    ],
    openapi: {
      summary: 'Authenticate user with email + password',
      tags: ['auth'],
      description:
        'Authenticates user with email and password. Sets the session cookie. Returns `{userId}` or `{userId, twoFactorRequired}` when 2FA is enabled.',
    },
    sdk: { exported: true, name: 'login' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof LoginSchema>;
      const result = await bc.login.execute({
        email: dto.email,
        password: dto.password,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      // 2FA challenge — no session cookie issued yet.
      if (result.twoFactorRequired) {
        return { userId: result.userId, twoFactorRequired: true as const };
      }

      await bc.createSession.execute({
        userId: result.userId,
        email: dto.email,
        cookieWriter: ctxCookieWriter(ctx),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { userId: result.userId, twoFactorRequired: false as const };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/login/verify-2fa',
    auth: { kind: 'public' },
    body: LoginVerify2faSchema,
    statusCode: 200,
    response: Verify2faResponseSchema,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 5, duration: 60, keyStrategy: 'ip' },
      },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Verify 2FA code during login',
      tags: ['auth'],
      description: 'Completes login by validating a TOTP or backup code. Sets the session cookie.',
    },
    sdk: { exported: true, name: 'verify2fa' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof LoginVerify2faSchema>;
      const result = await bc.login.completeWithTwoFactor({
        userId: dto.userId,
        code: dto.code,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      await bc.createSession.execute({
        userId: result.userId,
        email: result.email ?? '',
        cookieWriter: ctxCookieWriter(ctx),
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { userId: result.userId };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/logout',
    auth: { kind: 'jwt' },
    body: LogoutSchema,
    statusCode: 200,
    response: LogoutResponseSchema,
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Invalidate the current session cookie',
      tags: ['auth'],
      description:
        'Logs out the user by invalidating refresh token(s) and clearing the session cookie.',
    },
    sdk: { exported: true, name: 'logout' },
    handler: async (ctx, bc) => {
      const dto = ctx.body as z.infer<typeof LogoutSchema>;

      await bc.logout.execute({
        userId: ctx.user!.userId,
        refreshToken: dto.refreshToken,
        logoutAllSessions: dto.logoutAllSessions,
      });

      await bc.terminateSession.execute({
        cookieReader: ctxCookieReader(ctx),
        cookieWriter: ctxCookieWriter(ctx),
        terminateAllSessions: dto.logoutAllSessions,
      });

      // Q8 — return a success-message envelope; the route mounter
      // translates `code` via packages/i18n SUCCESS_MESSAGE_DICTIONARY
      // using the request's Accept-Language.
      return {
        code: dto.logoutAllSessions ? 'LOGOUT_ALL_SESSIONS' : 'LOGOUT_SUCCESS',
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/session',
    auth: { kind: 'optional' },
    response: SessionResponseSchema,
    openapi: {
      summary: 'Get Session',
      tags: ['auth'],
      description: 'Returns current user data if authenticated via session cookie or JWT bearer.',
    },
    sdk: { exported: true, name: 'session' },
    handler: async (ctx, bc) => {
      const result = await bc.validateSession.execute({
        cookieReader: ctxCookieReader(ctx),
        userId: ctx.user?.userId,
      });
      if (!result.success || !result.user) {
        throw new UnauthorizedException('Session is invalid or expired');
      }
      return { user: result.user };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/sessions',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    response: ListSessionsResponseSchema,
    openapi: {
      summary: 'List active sessions (devices) for the current user.',
      tags: ['auth'],
    },
    sdk: { exported: true, name: 'listSessions' },
    handler: async (ctx, bc) => {
      const sessions = await bc.sessionDevices.listActiveForUser(ctx.user!.userId);
      return { sessions };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/auth/sessions/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: RevokeSessionParams,
    statusCode: 204,
    openapi: {
      summary: 'Revoke a specific session (device) by refresh-token id.',
      tags: ['auth'],
    },
    sdk: { exported: true, name: 'revokeSession' },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as z.infer<typeof RevokeSessionParams>;
      await bc.sessionDevices.revokeForUser(ctx.user!.userId, id);
    },
  },
];
