import { z } from "zod";
import { EmailSchema } from "../primitives";

/**
 * Change Email Schema
 */
export const ChangeEmailSchema = z.object({
  newEmail: EmailSchema,
  currentPassword: z.string().min(1, "Password is required"),
});

export type ChangeEmail = z.infer<typeof ChangeEmailSchema>;

/**
 * Delete Account Schema
 */
export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type DeleteAccount = z.infer<typeof DeleteAccountSchema>;
