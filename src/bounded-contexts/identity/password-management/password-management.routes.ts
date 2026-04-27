/**
 * Route descriptors for the password-management BC. Replaces
 * `ChangePasswordController` and `ResetPasswordController`.
 *
 * `ForgotPasswordController` stays Nest-decorated because it relies on
 * `@Throttle({ default: { limit: 5, ttl: 60000 } })` from
 * `@nestjs/throttler` — per-route throttler config the synthesizer does
 * not yet model.
 */

import type { Route } from '@/shared-kernel/http/route';
import { PasswordManagementUseCases } from './application/ports/password-management.port';
import { ChangePasswordSchema } from './infrastructure/controllers/change-password.dto';
import { ResetPasswordSchema } from './infrastructure/controllers/reset-password.dto';

export const passwordManagementRoutes: ReadonlyArray<Route<PasswordManagementUseCases>> = [
  {
    method: 'POST',
    path: '/password/change',
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
    path: '/auth/reset-password',
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
