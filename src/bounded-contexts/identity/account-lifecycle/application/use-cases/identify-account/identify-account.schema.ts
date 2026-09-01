import { z } from 'zod';
import { EmailSchema } from '@/shared-kernel/schemas/primitives';

// Identifier-first entry point: the client sends only the e-mail and the
// response tells it which branch to render (sign-in vs sign-up). See the
// account-enumeration note on `IdentifyAccountPort`.
export const IdentifyAccountSchema = z
  .object({
    email: EmailSchema,
  })
  .openapi('IdentifyAccountRequest', {
    description:
      'Identifier-first lookup payload: the e-mail typed on the unified "sign in or create account" surface.',
    example: {
      email: 'jane.doe@example.com',
    },
  });

export type IdentifyAccountDto = z.infer<typeof IdentifyAccountSchema>;
