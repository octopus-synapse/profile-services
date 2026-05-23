import { z } from 'zod';
import { EmailSchema, PasswordInputSchema } from '../primitives';

/**
 * Change Email Schema
 */
export const ChangeEmailSchema = z.object({
  newEmail: EmailSchema,
  currentPassword: PasswordInputSchema,
});

export type ChangeEmail = z.infer<typeof ChangeEmailSchema>;

/**
 * Delete Account Schema
 */
export const DeleteAccountSchema = z.object({
  password: PasswordInputSchema,
});

export type DeleteAccount = z.infer<typeof DeleteAccountSchema>;

export type ChangeEmailDto = z.infer<typeof ChangeEmailSchema>;

export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
