import { z } from "zod";
import { EmailSchema, PasswordSchema } from "../primitives";

/**
 * Register Credentials Schema
 *
 * Validates registration request data.
 * Uses strict password validation.
 */
export const RegisterCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});

export type RegisterCredentials = z.infer<typeof RegisterCredentialsSchema>;
