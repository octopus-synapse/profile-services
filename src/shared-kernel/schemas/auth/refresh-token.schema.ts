import { z } from "zod";

/**
 * Refresh Token Schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
