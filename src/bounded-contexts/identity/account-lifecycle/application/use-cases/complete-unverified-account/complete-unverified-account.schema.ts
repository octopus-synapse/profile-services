import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';

export const CompleteUnverifiedAccountSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    emailVerificationToken: z.string().min(1),
    acceptedTosVersion: z.string().min(1),
    acceptedPrivacyVersion: z.string().min(1),
  })
  .openapi('CompleteUnverifiedAccountRequest', {
    example: {
      email: 'jane.doe@example.com',
      password: 'SecurePass123!',
      emailVerificationToken: 'signed-email-verification-token',
      acceptedTosVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    },
  });

export const CompleteUnverifiedAccountResponseSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
  })
  .openapi('CompleteUnverifiedAccountResponse');
