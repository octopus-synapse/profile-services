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
import {
  EmailSchema,
  PasswordInputSchema,
  PasswordSchema,
} from '@/shared-kernel/schemas/primitives';

// ─── Two-step password change (code-confirmed) ───────────────────────
export const RequestPasswordChangeSchema = z
  .object({
    currentPassword: PasswordInputSchema,
    newPassword: PasswordSchema,
  })
  .openapi('RequestPasswordChangeRequest', {
    description:
      'Step 1 of the code-confirmed password change. Validates current + new password and emails a 6-digit code; the password is not changed yet.',
    example: { currentPassword: 'NotTheRealPassword!', newPassword: 'NewSecurePass456!' },
  });

export const ConfirmPasswordChangeSchema = z
  .object({ code: z.string().length(6) })
  .openapi('ConfirmPasswordChangeRequest', {
    description: 'Step 2: confirm the emailed 6-digit code to apply the password change.',
    example: { code: '123456' },
  });

export const PasswordChangeCodeSentResponseSchema = z
  .object({
    code: z.string().optional(),
    message: z
      .string()
      .optional()
      .openapi({ description: 'Localized confirmation that a code was sent.' }),
    cooldownSeconds: z
      .number()
      .int()
      .openapi({ description: 'Seconds before a resend is allowed.' }),
    testCode: z
      .string()
      .optional()
      .openapi({ description: 'Non-production only (BYPASS_2FA): the issued code.' }),
  })
  .openapi('PasswordChangeCodeSentResponse');

// ─── Two-step email change (code-confirmed) ──────────────────────────
export const RequestEmailChangeSchema = z
  .object({
    currentPassword: PasswordInputSchema,
    newEmail: EmailSchema,
  })
  .openapi('RequestEmailChangeRequest', {
    description:
      'Step 1 of the code-confirmed email change. Verifies the current password and emails a 6-digit code to the NEW address; the email is not changed yet.',
    example: { currentPassword: 'NotTheRealPassword!', newEmail: 'new@example.com' },
  });

export const ConfirmEmailChangeSchema = z
  .object({ code: z.string().length(6) })
  .openapi('ConfirmEmailChangeRequest', {
    description: 'Step 2: confirm the emailed 6-digit code to apply the email change.',
    example: { code: '123456' },
  });

export const EmailChangeCodeSentResponseSchema = z
  .object({
    code: z.string().optional(),
    message: z
      .string()
      .optional()
      .openapi({ description: 'Localized confirmation that a code was sent.' }),
    cooldownSeconds: z
      .number()
      .int()
      .openapi({ description: 'Seconds before a resend is allowed.' }),
    testCode: z
      .string()
      .optional()
      .openapi({ description: 'Non-production only (BYPASS_2FA): the issued code.' }),
  })
  .openapi('EmailChangeCodeSentResponse');

export const ForgotPasswordSchema = z
  .object({ email: EmailSchema })
  .openapi('ForgotPasswordRequest', {
    description:
      'Forgot-password trigger. Always returns the same generic success message regardless of whether the email exists, to avoid account enumeration.',
    example: {
      email: 'user@example.com',
    },
  });

// ─── Response schemas ────────────────────────────────────────────────
// All three endpoints return the same `{ message }` envelope.
export const PasswordMessageResponseSchema = z
  .object({
    message: z.string().openapi({ description: 'Localized success message for the operation.' }),
  })
  .openapi('PasswordMessageResponse', {
    description: 'Generic success envelope for password-management endpoints.',
  });
