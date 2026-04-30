/**
 * Route descriptors for the two-factor-auth BC.
 *
 * Replaces the per-endpoint Nest controllers under
 * `infrastructure/controllers/`. The handlers are pure async functions
 * that receive the framework-free `HttpCtx` plus the use-case bundle.
 *
 * Note: the disable endpoint historically returned HTTP 204; the
 * synthesizer normalizes everything to 200, so we now return
 * `{ success: true, data: null }` on delete. Once `Route.statusCode`
 * lands the descriptor can opt back into 204.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { TwoFactorAuthUseCases } from './application/ports/two-factor-auth.port';

const VerifyAndEnable2faSchema = z.object({ code: z.string().length(6) });

export const twoFactorAuthRoutes: ReadonlyArray<Route<TwoFactorAuthUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/2fa/setup',
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Setup 2FA',
      tags: ['Two-Factor Auth'],
      description: 'Generates TOTP secret and QR code. 2FA is not enabled until verified.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = await bc.setup2fa.execute(ctx.user!.userId);
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/2fa/verify',
    auth: { kind: 'jwt' },
    body: VerifyAndEnable2faSchema,
    openapi: {
      summary: 'Verify token and enable 2FA',
      tags: ['Two-Factor Auth'],
      description: 'Verifies TOTP token and enables 2FA. Returns backup codes (shown only once).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { code } = ctx.body as { code: string };
      const result = await bc.verifyAndEnable2fa.execute(ctx.user!.userId, code);
      return result;
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/2fa/status',
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Get 2FA status',
      tags: ['Two-Factor Auth'],
      description: 'Returns 2FA status including enabled state and backup codes remaining.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = await bc.get2faStatus.execute(ctx.user!.userId);
      return { ...result, lastUsedAt: result.lastUsedAt?.toISOString() ?? null };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/2fa/backup-codes/regenerate',
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Regenerate backup codes',
      tags: ['Two-Factor Auth'],
      description: 'Generates new backup codes, replacing existing ones. Shown only once.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = await bc.regenerateBackupCodes.execute(ctx.user!.userId);
      return result;
    },
  },
  {
    method: 'DELETE',
    path: '/v1/auth/2fa',
    statusCode: 204,
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Disable 2FA',
      tags: ['Two-Factor Auth'],
      description: 'Disables 2FA and removes all backup codes.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.disable2fa.execute(ctx.user!.userId);
    },
  },
];
