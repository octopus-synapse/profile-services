import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';

// LGPD: explicit consent required at signup. Versions must match current
// TOS_VERSION / PRIVACY_POLICY_VERSION.
export const CreateAccountSchema = z
  .object({
    name: z.string().optional(),
    email: EmailSchema,
    password: PasswordSchema,
    acceptedTosVersion: z.string().min(1),
    acceptedPrivacyVersion: z.string().min(1),
  })
  .openapi({
    example: {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'SecurePass123!',
      acceptedTosVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    },
  });

// Response Schema - includes tokens for auto-login after signup
export const CreateAccountResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  message: z.string(), // Auth tokens (auto-login)
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

// DTO Classes

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

export type CreateAccountResponseDto = z.infer<typeof CreateAccountResponseSchema>;
