import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '../primitives';

/**
 * Reset Password Request Schema
 */
export const ResetPasswordRequestSchema = z.object({ email: EmailSchema });

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

/**
 * New Password Schema (for password reset)
 */
export const NewPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: PasswordSchema,
});

export type NewPassword = z.infer<typeof NewPasswordSchema>;

/**
 * Change Password Schema
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
});

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

export type ResetPasswordRequestDto = z.infer<typeof ResetPasswordRequestSchema>;

export type NewPasswordDto = z.infer<typeof NewPasswordSchema>;

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
