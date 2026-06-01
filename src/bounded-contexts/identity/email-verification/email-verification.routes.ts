/**
 * Route descriptors for the email-verification BC. Replaces
 * `VerifyEmailController` and `SendVerificationController`.
 *
 * The send/resend-status endpoints rely on the global
 * `EmailVerifiedGuard` short-circuiting when the
 * `allowUnverifiedEmail` metadata is present — declared via
 * `route.guards: [{ id: 'allow-unverified-email' }]`. The matching
 * registry lives in `email-verification.module.ts`.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { renderSuccessMessageForRequest } from '@/shared-kernel/http/success-message';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import {
  ResendCooldownResponseSchema,
  SendVerificationResponseSchema,
  VerifyEmailResponseSchema,
} from './email-verification.routes.schemas';
import { VerifyEmailSchema } from './infrastructure/controllers/verify-email.schema';

export const emailVerificationRoutes: ReadonlyArray<Route<EmailVerificationUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/email-verification/verify',
    auth: { kind: 'public' },
    body: VerifyEmailSchema,
    response: VerifyEmailResponseSchema,
    guards: [
      // P0-#4 + P1 #4 — the verification code is 6 digits (10^6
      // keyspace, 15min TTL); 5/5min keyed by IP was the original bar
      // but a small botnet (~1000 IPs) could still sweep ~7% of the
      // keyspace per token. Tighten to 3/5min and surface a tighter
      // ceiling on a botnet-scale attack. A real user typing the code
      // wrong twice still has a free attempt within the same window.
      { id: 'rate-limit', metadata: { points: 3, duration: 300, keyStrategy: 'ip' } },
      { id: 'multi-step-flow' },
    ],
    openapi: {
      summary: 'Verify email with token',
      tags: ['email-verification'],
      description: 'Verifies the user email using the token received via email.',
    },
    sdk: { exported: true, name: 'verify' },
    handler: async (ctx, bc) => {
      const { token } = ctx.body as { token: string };
      const result = await bc.verifyEmail.execute({ token });
      return { email: result.email, message: 'Email has been verified successfully.' };
    },
  },
  {
    method: 'POST',
    path: '/v1/auth/email-verification/send',
    auth: { kind: 'jwt' },
    statusCode: 200,
    response: SendVerificationResponseSchema,
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Send verification email',
      tags: ['email-verification'],
      description: 'Sends a verification email to the authenticated user. No body required.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const resendResult = await bc.sendVerificationEmail.execute({ userId: ctx.user!.userId });
      const { testCode, ...cooldown } = resendResult;
      // The mounter's `isSuccessMessage` only renders `message` when the
      // body is exactly `{ code, params? }`. The extra `cooldown` field
      // makes it bail, so render the localized `message` inline here.
      const { message } = renderSuccessMessageForRequest(
        { code: 'EMAIL_VERIFICATION_SENT' },
        ctx.headers['accept-language'],
      );
      return { code: 'EMAIL_VERIFICATION_SENT' as const, message, cooldown, testCode };
    },
  },
  {
    method: 'GET',
    path: '/v1/auth/email-verification/resend-status',
    auth: { kind: 'jwt' },
    response: ResendCooldownResponseSchema,
    guards: [{ id: 'allow-unverified-email' }],
    openapi: {
      summary: 'Get verification email resend cooldown',
      tags: ['email-verification'],
      description:
        'Returns how many seconds the authenticated user must wait before requesting another verification email. The UI uses this so the countdown survives page reloads.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const cooldown = await bc.getResendCooldown.execute({ userId: ctx.user!.userId });
      return cooldown;
    },
  },
];
