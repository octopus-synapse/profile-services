/**
 * Route descriptors for the account-lifecycle BC. Replaces the
 * deactivate-account and delete-account controllers.
 *
 * The remaining controllers stay Nest-decorated:
 * - `CreateAccountController`: cookie-set + IP/user-agent capture for
 *   audit (the synthesizer does not expose `Request`/`Response`).
 * - `AcceptConsentController` / `GetConsentStatusController` /
 *   `GetConsentHistoryController`: rely on `@SkipTosCheck()` and
 *   `@AllowUnverifiedEmail()` to bypass the global ConsentGuard /
 *   EmailVerifiedGuard, which the synthesizer does not yet model.
 * - `ExportDataController`: needs `req.ip` for the audit log.
 */

import type { Route } from '@/shared-kernel/http/route';
import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import { DeactivateAccountSchema } from './application/use-cases/deactivate-account/deactivate-account.dto';
import { DeleteAccountSchema } from './application/use-cases/delete-account/delete-account.dto';

export const accountLifecycleRoutes: ReadonlyArray<Route<AccountLifecycleUseCases>> = [
  {
    method: 'DELETE',
    path: '/accounts/deactivate',
    auth: { kind: 'jwt' },
    body: DeactivateAccountSchema,
    openapi: {
      summary: 'Deactivate account',
      tags: ['Account Lifecycle'],
      description: 'Deactivates the authenticated user account (soft delete).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { reason?: string };
      await bc.deactivateAccount.execute({
        userId: ctx.user!.userId,
        reason: body.reason,
      });
      return {
        success: true,
        data: { message: 'Account has been deactivated.' },
      };
    },
  },
  {
    method: 'DELETE',
    path: '/accounts',
    auth: { kind: 'jwt' },
    body: DeleteAccountSchema,
    openapi: {
      summary: 'Delete account permanently',
      tags: ['Account Lifecycle'],
      description:
        'Permanently deletes the user account. Requires confirmation phrase: "DELETE MY ACCOUNT".',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { confirmationPhrase: string };
      await bc.deleteAccount.execute({
        userId: ctx.user!.userId,
        confirmationPhrase: body.confirmationPhrase,
      });
      return {
        success: true,
        data: { message: 'Account has been permanently deleted.' },
      };
    },
  },
];
