/**
 * Route descriptors for the email-verification BC. Replaces
 * `VerifyEmailController`. The `SendVerificationController` stays
 * Nest-decorated because it relies on `@AllowUnverifiedEmail()` to
 * bypass the global `EmailVerifiedGuard`, which the synthesizer does
 * not yet model.
 */

import type { Route } from '@/shared-kernel/http/route';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import { VerifyEmailSchema } from './infrastructure/controllers/verify-email.dto';

export const emailVerificationRoutes: ReadonlyArray<Route<EmailVerificationUseCases>> = [
  {
    method: 'POST',
    path: '/email-verification/verify',
    auth: { kind: 'public' },
    body: VerifyEmailSchema,
    openapi: {
      summary: 'Verify email with token',
      tags: ['Email Verification'],
      description: 'Verifies the user email using the token received via email.',
    },
    sdk: { exported: true, name: 'verify' },
    handler: async (ctx, bc) => {
      const { token } = ctx.body as { token: string };
      const result = await bc.verifyEmail.execute({ token });
      return {
        success: true,
        data: { email: result.email, message: 'Email has been verified successfully.' },
      };
    },
  },
];
