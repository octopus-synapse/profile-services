import { z } from "zod";
import { RegisterCredentialsSchema } from "./register.schema";

/**
 * Temporary User Schema
 *
 * Creates a temporary user for E2E testing.
 * Temporary users are automatically deleted after the specified TTL.
 *
 * Default TTL: 24 hours (86400 seconds)
 * Max TTL: 7 days (604800 seconds)
 */
export const CreateTemporaryUserSchema = RegisterCredentialsSchema.extend({
 /**
  * Time-to-live in seconds (default: 24 hours)
  * After this time, the user and all associated data will be deleted
  */
 ttlSeconds: z
  .number()
  .int()
  .min(60, "TTL must be at least 60 seconds")
  .max(604800, "TTL cannot exceed 7 days")
  .default(86400)
  .optional(),
});

export type CreateTemporaryUser = z.infer<typeof CreateTemporaryUserSchema>;

/**
 * Temporary User Response Schema
 */
export const TemporaryUserResponseSchema = z.object({
 user: z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  isTemporary: z.literal(true),
  expiresAt: z.string().datetime(),
 }),
 accessToken: z.string(),
 refreshToken: z.string(),
});

export type TemporaryUserResponse = z.infer<typeof TemporaryUserResponseSchema>;
