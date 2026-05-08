import { z } from 'zod';

// Request Schema
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .openapi({
    example: {
      currentPassword: 'OldPass123!',
      newPassword: 'NewSecurePass456!',
    },
  });

// Response Schema
const ChangePasswordResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export type ChangePasswordResponseDto = z.infer<typeof ChangePasswordResponseSchema>;
