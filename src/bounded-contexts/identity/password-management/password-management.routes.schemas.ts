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
import { EmailSchema } from '@/shared-kernel/schemas/primitives';

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
  .object({ message: z.string() })
  .openapi('PasswordMessageResponse', {
    description: 'Generic success envelope for password-management endpoints.',
  });
