import { z } from 'zod';

// Request Schema
export const CreateAccountSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(8), // LGPD: explicit consent required at signup. Versions must match current TOS_VERSION/PRIVACY_POLICY_VERSION.
    acceptedTosVersion: z.string().min(1),
    acceptedPrivacyVersion: z.string().min(1),
  })
  .openapi({
    example: {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: 'SecurePass123!',
      acceptedTosVersion: '2026-01-01',
      acceptedPrivacyVersion: '2026-01-01',
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
