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

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { EmailVerificationUseCases } from './application/ports/email-verification.port';
import { VerifyEmailSchema } from './infrastructure/controllers/verify-email.dto';

// ─── Response schemas ────────────────────────────────────────────────
const VerifyEmailResponseSchema = z.object({
  email: z.string(),
  message: z.string(),
});

// `cooldown` is the `ResendCooldown` shape from the send/resend ports.
const ResendCooldownShape = z.object({
  secondsUntilResendAllowed: z.number().int().min(0),
  cooldownSeconds: z.number().int().min(0),
});

const SendVerificationResponseSchema = z.object({
  message: z.string(),
  cooldown: ResendCooldownShape,
});

const ResendCooldownResponseSchema = ResendCooldownShape;

export const emailVerificationRoutes: ReadonlyArray<Route<EmailVerificationUseCases>> = [
  {
    method: 'POST',
    path: '/v1/auth/email-verification/verify',
    auth: { kind: 'public' },
    body: VerifyEmailSchema,
    response: VerifyEmailResponseSchema,
    openapi: {
      summary: 'Verify email with token',
      tags: ['Email Verification'],
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
      tags: ['Email Verification'],
      description: 'Sends a verification email to the authenticated user. No body required.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const cooldown = await bc.sendVerificationEmail.execute({ userId: ctx.user!.userId });
      return { message: 'Verification email has been sent.', cooldown };
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
      tags: ['Email Verification'],
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
