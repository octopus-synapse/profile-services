/**
 * Schemas for the platform/config BC. Exposes server-side configuration
 * the frontend needs to mirror without duplicating constants.
 */

import { z } from 'zod';
import { PASSWORD_POLICY } from '@/shared-kernel/schemas/primitives/password.schema';

// ─── Response schemas ────────────────────────────────────────────────

export const PasswordPolicyResponseSchema = z
  .object({
    minLength: z.number().int().min(1),
    maxLength: z.number().int().min(1),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecialChar: z.boolean(),
    specialChars: z.string(),
  })
  .openapi('PasswordPolicy', {
    description:
      'Password validation rules enforced by the server. Frontend forms (sign-up, password change, password-strength meter) consume this so the rules live in one place.',
    example: {
      minLength: PASSWORD_POLICY.minLength,
      maxLength: PASSWORD_POLICY.maxLength,
      requireUppercase: PASSWORD_POLICY.requireUppercase,
      requireLowercase: PASSWORD_POLICY.requireLowercase,
      requireNumber: PASSWORD_POLICY.requireNumber,
      requireSpecialChar: PASSWORD_POLICY.requireSpecialChar,
      specialChars: PASSWORD_POLICY.specialChars,
    },
  });

export type PasswordPolicyResponse = z.infer<typeof PasswordPolicyResponseSchema>;
