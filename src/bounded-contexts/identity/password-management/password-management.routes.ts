/**
 * Route descriptors for the password-management BC. Replaces
 * `ChangePasswordController`, `ResetPasswordController`, and
 * `ForgotPasswordController`.
 *
 * The forgot-password endpoint declares its per-route throttler limit
 * via `Route.guards: [{ id: 'throttle', metadata: { default: { … } } }]`
 * — the BC's module wires `RouteThrottlerGuard` (a thin adapter over
 * `ThrottlerGuard` from `@nestjs/throttler`) into the registry.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { PasswordManagementUseCases } from './application/ports/password-management.port';
import { ChangePasswordSchema } from './infrastructure/controllers/change-password.dto';
import { ResetPasswordSchema } from './infrastructure/controllers/reset-password.dto';

const ForgotPasswordSchema = z.object({ email: z.string().email() });

export const passwordManagementRoutes: ReadonlyArray<Route<PasswordManagementUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/forgot-password',
    auth: { kind: 'public' },
    body: ForgotPasswordSchema,
    statusCode: 200,
    guards: [{ id: 'throttle', metadata: { default: { limit: 5, ttl: 60000 } } }],
    openapi: {
      summary: 'Request password reset',
      tags: ['Password Management'],
      description:
        'Sends a password reset email if the account exists. Always returns success to prevent email enumeration.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { email: string };
      await bc.forgotPassword.execute({ email: body.email });
      return {
        success: true,
        data: { message: 'If this email exists, a reset link has been sent.' },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/me/password/change',
    auth: { kind: 'jwt' },
    body: ChangePasswordSchema,
    openapi: {
      summary: 'Change password',
      tags: ['Password Management'],
      description:
        'Changes the password for the authenticated user after verifying the current password.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { currentPassword: string; newPassword: string };
      await bc.changePassword.execute({
        userId: ctx.user!.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      return {
        success: true,
        data: { message: 'Password has been changed successfully.' },
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/reset-password',
    auth: { kind: 'public' },
    body: ResetPasswordSchema,
    openapi: {
      summary: 'Reset password with token',
      tags: ['Password Management'],
      description: 'Resets the user password using a valid reset token received via email.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { token: string; newPassword: string };
      await bc.resetPassword.execute({
        token: body.token,
        newPassword: body.newPassword,
      });
      return {
        success: true,
        data: { message: 'Password has been reset successfully.' },
      };
    },
  },
];
