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

// Pre-signup start mirrors the authenticated send's shape so the client
// renders both flows with the same component.
export const StartPreSignupVerificationResponseSchema = SendVerificationResponseSchema;

export const ConfirmPreSignupVerificationResponseSchema = z
  .object({
    email: z
      .string()
      .openapi({ description: 'The e-mail this token vouches for.', example: 'jane@example.com' }),
    registrationToken: z.string().openapi({
      description:
        'HMAC-signed continuation token proving the e-mail was verified; send as `emailVerificationToken` on POST /v1/accounts within 30 minutes.',
      example: 'cHJlLXNpZ251cA.1735689600000.signature',
    }),
  })
  .openapi('ConfirmPreSignupVerificationResponse', {
    description:
      'Successful pre-signup confirmation: carry the registration token into the signup call.',
  });
