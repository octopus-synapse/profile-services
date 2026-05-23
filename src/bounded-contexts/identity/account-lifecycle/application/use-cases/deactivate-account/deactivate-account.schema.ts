import { z } from 'zod';

// Request Schema
export const DeactivateAccountSchema = z.object({ reason: z.string().optional() });

// Response Schema
const DeactivateAccountResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type DeactivateAccountDto = z.infer<typeof DeactivateAccountSchema>;

export type DeactivateAccountResponseDto = z.infer<typeof DeactivateAccountResponseSchema>;
