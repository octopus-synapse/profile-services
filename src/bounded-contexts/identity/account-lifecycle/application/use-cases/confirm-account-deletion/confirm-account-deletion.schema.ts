import { z } from 'zod';

// Step 2: confirm the emailed 6-digit code to permanently erase the account.
export const ConfirmAccountDeletionSchema = z
  .object({ code: z.string().length(6) })
  .openapi('ConfirmAccountDeletionRequest', {
    description: 'Step 2: confirm the emailed 6-digit code to permanently delete the account.',
    example: { code: '123456' },
  });

export type ConfirmAccountDeletionDto = z.infer<typeof ConfirmAccountDeletionSchema>;
