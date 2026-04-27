/**
 * Route descriptors for the authentication BC. Replaces
 * `RefreshTokenController`.
 *
 * The other authentication controllers stay Nest-decorated:
 * - `LoginController`: needs `Res()` (set session cookie) plus `Req()`
 *   for `req.ip` / user-agent capture; the 2FA verify endpoint also
 *   uses `RateLimitGuard`, which the synthesizer does not model.
 * - `LogoutController`: needs `Res()`/`Req()` (cookie reader/writer)
 *   plus `@AllowUnverifiedEmail()` to bypass the global email-verified
 *   guard.
 * - `SessionController`: `getSession` reads `req.cookies` directly and
 *   the device-listing endpoints depend on a Nest-side `SessionDeviceService`;
 *   migrating them would require splitting the controller.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';

const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1) });

export const authenticationRoutes: ReadonlyArray<Route<AuthenticationHttpBundle>> = [
  {
    method: 'POST',
    path: '/auth/refresh',
    auth: { kind: 'public' },
    body: RefreshTokenSchema,
    openapi: {
      summary: 'Refresh access token',
      tags: ['auth'],
      description: 'Issues new access and refresh tokens using a valid refresh token.',
    },
    sdk: { exported: true, name: 'refresh' },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof RefreshTokenSchema>;
      const result = await bc.refreshToken.execute({ refreshToken: body.refreshToken });
      return {
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      };
    },
  },
];
