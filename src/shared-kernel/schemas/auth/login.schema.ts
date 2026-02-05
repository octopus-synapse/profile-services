import { z } from "zod";
import { EmailSchema, PasswordInputSchema } from "../primitives";

/**
 * Login Credentials Schema
 *
 * Validates login request data.
 * Uses lenient password validation (allows legacy passwords).
 */
export const LoginCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordInputSchema,
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
