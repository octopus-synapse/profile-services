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
import type { Route } from '@/shared-kernel/http/route';
import { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import { ctxCookieReader, ctxCookieWriter } from './application/services/ctx-cookie-bridge';
import { LoginSchema, LoginVerify2faSchema } from './application/use-cases/login/login.dto';

const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1).optional() });
const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutAllSessions: z.boolean().default(false),
});
const RevokeSessionParams = z.object({ id: z.string() });

export const authenticationRoutes: ReadonlyArray<Route<AuthenticationHttpBundle>> = [
  {
    method: 'POST',
    path: '/v1/auth/refresh',
    auth: { kind: 'public' },
    body: RefreshTokenSchema,
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
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        };
      }
      return { ok: true };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/login',
    auth: { kind: 'public' },
    body: LoginSchema,
    statusCode: 200,
    openapi: {
      summary: 'Login',
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

      return { userId: result.userId };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/login/verify-2fa',
    auth: { kind: 'public' },
    body: LoginVerify2faSchema,
    statusCode: 200,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 5, duration: 60, keyStrategy: 'ip' },
      },
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
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Logout',
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

      const message = dto.logoutAllSessions
        ? 'Logged out from all sessions.'
        : 'Logged out successfully.';

      return { message };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/session',
    auth: { kind: 'optional' },
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
      return { authenticated: result.success, user: result.user };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/sessions',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
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
    statusCode: 200,
    openapi: {
      summary: 'Revoke a specific session (device) by refresh-token id.',
      tags: ['auth'],
    },
    sdk: { exported: true, name: 'revokeSession' },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as z.infer<typeof RevokeSessionParams>;
      await bc.sessionDevices.revokeForUser(ctx.user!.userId, id);
      return { revoked: true as const };
    },
  },
];
