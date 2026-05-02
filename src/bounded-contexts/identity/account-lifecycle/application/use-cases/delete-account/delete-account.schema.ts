import { z } from 'zod';

// Request Schema
export const DeleteAccountSchema = z.object({ confirmationPhrase: z.string().min(1) });

// Response Schema
const DeleteAccountResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;

export type DeleteAccountResponseDto = z.infer<typeof DeleteAccountResponseSchema>;
