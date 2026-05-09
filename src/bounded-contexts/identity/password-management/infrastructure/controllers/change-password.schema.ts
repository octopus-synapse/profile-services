import { z } from 'zod';
import { PasswordInputSchema, PasswordSchema } from '@/shared-kernel/schemas/primitives';

// Request Schema
export const ChangePasswordSchema = z
  .object({
    currentPassword: PasswordInputSchema,
    newPassword: PasswordSchema,
  })
  .openapi({
    example: {
      currentPassword: 'NotTheRealPassword!',
      newPassword: 'NewSecurePass456!',
    },
  });

// Response Schema
const ChangePasswordResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export type ChangePasswordResponseDto = z.infer<typeof ChangePasswordResponseSchema>;
