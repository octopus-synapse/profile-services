import { z } from 'zod';

// Step 1 of the code-confirmed deletion: re-prove ownership (phrase + current
// password). A stolen JWT cookie must not be able to start deletion on its own.
export const RequestAccountDeletionSchema = z
  .object({
    confirmationPhrase: z.string().min(1),
    currentPassword: z.string().min(1).max(200),
  })
  .openapi('RequestAccountDeletionRequest', {
    description:
      'Step 1 of the code-confirmed account deletion. Validates the confirmation phrase + current password and emails a 6-digit code; nothing is deleted yet.',
    example: { confirmationPhrase: 'DELETE MY ACCOUNT', currentPassword: 'NotTheRealPassword!' },
  });

export type RequestAccountDeletionDto = z.infer<typeof RequestAccountDeletionSchema>;
