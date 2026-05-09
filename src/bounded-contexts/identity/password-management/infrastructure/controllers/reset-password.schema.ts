import { z } from 'zod';
import { PasswordSchema } from '@/shared-kernel/schemas/primitives';

// Request Schema
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: PasswordSchema,
  })
  .openapi('ResetPasswordRequest', {
    description:
      'Token-based password reset. The token is single-use and was previously emailed via the forgot-password flow.',
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
