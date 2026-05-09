import { z } from 'zod';

// Request Schema
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .openapi({
    example: {
      token: 'fixture-pw-reset-token-cccccccccccccccc',
      newPassword: 'NewSecurePass456!',
    },
  });

// Response Schema
const ResetPasswordResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export type ResetPasswordResponseDto = z.infer<typeof ResetPasswordResponseSchema>;
