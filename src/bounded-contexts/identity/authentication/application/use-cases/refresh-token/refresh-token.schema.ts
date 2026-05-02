import { z } from 'zod';

// Request Schema
const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1) });

// Response Schema
const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

// DTO Classes

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export type RefreshTokenResponseDto = z.infer<typeof RefreshTokenResponseSchema>;
