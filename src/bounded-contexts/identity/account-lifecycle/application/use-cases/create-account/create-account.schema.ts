import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';

// LGPD: explicit consent required at signup. Versions must match current
// TOS_VERSION / PRIVACY_POLICY_VERSION.
export const CreateAccountSchema = z
  .object({
    name: z
      .string()
      .optional()
      .openapi({ description: 'Display name (optional). Defaults to email handle.' }),
    email: EmailSchema,
    password: PasswordSchema,
    acceptedTosVersion: z
      .string()
      .min(1)
      .openapi({ description: 'Current TOS version the user has accepted (LGPD consent).' }),
    acceptedPrivacyVersion: z.string().min(1).openapi({
      description: 'Current privacy policy version the user has accepted (LGPD consent).',
    }),
  })
  .openapi('CreateAccountRequest', {
    description:
      'Sign-up payload. LGPD requires explicit `acceptedTosVersion` / `acceptedPrivacyVersion` matching the current published versions.',
    example: {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'SecurePass123!',
      acceptedTosVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    },
  });

// Response Schema - includes tokens for auto-login after signup
export const CreateAccountResponseSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
    message: z.string(), // Auth tokens (auto-login)
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  })
  .openapi('CreateAccountResponse', {
    description:
      'Sign-up response with auth tokens for auto-login. The session cookie is also set in parallel.',
  });

// DTO Classes

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

export type CreateAccountResponseDto = z.infer<typeof CreateAccountResponseSchema>;
