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

// ─── Response schemas ────────────────────────────────────────────────
export const VerifyEmailResponseSchema = z.object({
  email: z.string(),
  message: z.string(),
});

// `cooldown` is the `ResendCooldown` shape from the send/resend ports.
export const ResendCooldownShape = z.object({
  secondsUntilResendAllowed: z.number().int().min(0),
  cooldownSeconds: z.number().int().min(0),
});

export const SendVerificationResponseSchema = z.object({
  // P1-045 — handler returns a `code` (resolved by the success-message
  // dictionary in the i18n stage); legacy `message` kept optional for
  // backward compat with any client that hadn't switched yet.
  code: z.string().optional(),
  message: z.string().optional(),
  cooldown: ResendCooldownShape,
  testCode: z.string().optional().openapi({ example: '123456' }),
});

export const ResendCooldownResponseSchema = ResendCooldownShape;
