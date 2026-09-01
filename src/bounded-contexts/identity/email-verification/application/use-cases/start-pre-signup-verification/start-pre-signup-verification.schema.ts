import { z } from 'zod';
import { EmailSchema } from '@/shared-kernel/schemas/primitives';

// Identifier-first flow: sends a 6-digit code to an e-mail that has no
// account yet (the client reaches this after /v1/auth/identify said so).
export const StartPreSignupVerificationSchema = z
  .object({
    email: EmailSchema,
  })
  .openapi('StartPreSignupVerificationRequest', {
    description:
      'Pre-signup verification payload: the e-mail to receive the 6-digit code before any account exists.',
    example: {
      email: 'jane.doe@example.com',
    },
  });

export type StartPreSignupVerificationDto = z.infer<typeof StartPreSignupVerificationSchema>;

export const ConfirmPreSignupVerificationSchema = z
  .object({
    email: EmailSchema,
    code: z
      .string()
      .regex(/^\d{6}$/, 'Code must be 6 digits') // lint-allow-magic-number: 6 is the wire format, not a tunable
      .openapi({ description: 'The 6-digit code received by e-mail.', example: '123456' }),
  })
  .openapi('ConfirmPreSignupVerificationRequest', {
    description:
      'Pre-signup confirmation payload: e-mail + the 6-digit code; success returns the registration token signup consumes.',
    example: {
      email: 'jane.doe@example.com',
      code: '123456',
    },
  });

export type ConfirmPreSignupVerificationDto = z.infer<typeof ConfirmPreSignupVerificationSchema>;
