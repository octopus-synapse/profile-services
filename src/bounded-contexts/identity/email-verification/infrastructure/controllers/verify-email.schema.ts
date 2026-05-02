import { z } from 'zod';

// Request Schema
export const VerifyEmailSchema = z.object({ token: z.string().min(1) });

// Response Schema
const VerifyEmailResponseSchema = z.object({ email: z.string(), message: z.string() });

// DTO Classes

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export type VerifyEmailResponseDto = z.infer<typeof VerifyEmailResponseSchema>;
