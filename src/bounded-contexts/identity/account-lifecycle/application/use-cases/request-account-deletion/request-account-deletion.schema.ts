import { z } from 'zod';

// Step 1 of the code-confirmed deletion: re-prove ownership (phrase + current
// password). A stolen JWT cookie must not be able to start deletion on its own.
export const RequestAccountDeletionSchema = z
  .object({
    confirmationPhrase: z
      .string()
      .min(1)
      .describe('Literal confirmation phrase typed by the user (e.g. "DELETE MY ACCOUNT").'),
    currentPassword: z
      .string()
      .min(1)
      .max(200)
      .describe('Current account password, re-proving ownership before deletion starts.'),
  })
  .openapi('RequestAccountDeletionRequest', {
    description:
      'Step 1 of the code-confirmed account deletion. Validates the confirmation phrase + current password and emails a 6-digit code; nothing is deleted yet.',
    example: { confirmationPhrase: 'DELETE MY ACCOUNT', currentPassword: 'NotTheRealPassword!' },
  });

export type RequestAccountDeletionDto = z.infer<typeof RequestAccountDeletionSchema>;
