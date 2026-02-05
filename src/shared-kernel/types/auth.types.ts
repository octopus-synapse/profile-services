import { z } from "zod";

/**
 * Auth Types
 *
 * Authentication response types shared between frontend and backend.
 * Request types (DTOs) are in ../dtos/auth.dto.ts
 */

/**
 * Auth Tokens Schema
 * Returned after successful authentication
 */
export const AuthTokensSchema = z.object({
 accessToken: z.string(),
 refreshToken: z.string().optional(),
 expiresIn: z.number().int().positive(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

/**
 * Auth Response Schema
 * Complete authentication response with user info
 */
export const AuthResponseSchema = z.object({
 user: z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["USER", "ADMIN", "APPROVER"]),
 }),
 tokens: AuthTokensSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Refresh Token Response Schema
 */
export const RefreshTokenResponseSchema = z.object({
 accessToken: z.string(),
 expiresIn: z.number().int().positive(),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
