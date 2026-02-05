import { z } from "zod";

/**
 * Email Schema
 *
 * Reusable email validation primitive.
 * Single source of truth for email format validation.
 */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .min(5, "Email must be at least 5 characters")
  .max(255, "Email must not exceed 255 characters");

export type Email = z.infer<typeof EmailSchema>;
