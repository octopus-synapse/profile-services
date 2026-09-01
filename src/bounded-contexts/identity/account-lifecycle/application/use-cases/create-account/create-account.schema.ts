import { z } from 'zod';
import { EmailSchema, FullNameSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';

// LGPD: explicit consent required at signup. Versions must match current
// TOS_VERSION / PRIVACY_POLICY_VERSION.
export const CreateAccountSchema = z
  .object({
    // Optional on the wire (defaults to the email handle) but, when sent,
    // held to the same 2-100 rule every other name field uses.
    name: FullNameSchema.optional(),
    email: EmailSchema,
    password: PasswordSchema,
    acceptedTosVersion: z
      .string()
      .min(1)
      .openapi({ description: 'Current TOS version the user has accepted (LGPD consent).' }),
    acceptedPrivacyVersion: z.string().min(1).openapi({
      description: 'Current privacy policy version the user has accepted (LGPD consent).',
    }),
    emailVerificationToken: z.string().min(1).optional().openapi({
      description:
        'Identifier-first flow: the registration token from POST /v1/auth/email-verification/confirm. When present and valid for this e-mail, the account is created with the e-mail already verified.',
      example: 'cHJlLXNpZ251cA.1735689600000.signature',
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

// Response Schema — identity-only. The httpOnly session cookie is set by
// the route handler via `createSession.execute`; tokens are NOT exposed
// to JS (P2 hardening: would defeat XSS-exfiltration defense of httpOnly).
export const CreateAccountResponseSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
    message: z.string(),
  })
  .openapi('CreateAccountResponse', {
    description:
      'Sign-up response. Authentication is established via the httpOnly session cookie set in parallel; no tokens are returned in the body.',
  });

// DTO Classes

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

export type CreateAccountResponseDto = z.infer<typeof CreateAccountResponseSchema>;
