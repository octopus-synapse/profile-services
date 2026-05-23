import { z } from 'zod';

// Request Schema
// P0-#8 follow-up: a stolen JWT cookie should not be able to delete the
// account just by submitting a public confirmation phrase. Requires the user
// to re-prove credential ownership with the current password.
export const DeleteAccountSchema = z.object({
  confirmationPhrase: z.string().min(1),
  currentPassword: z.string().min(1).max(200),
});

// Response Schema
const DeleteAccountResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;

export type DeleteAccountResponseDto = z.infer<typeof DeleteAccountResponseSchema>;
