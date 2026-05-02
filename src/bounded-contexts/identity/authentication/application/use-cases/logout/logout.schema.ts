import { z } from 'zod';

// Request Schema
const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutAllSessions: z.boolean().default(false),
});

// Response Schema
const LogoutResponseSchema = z.object({ message: z.string() });

// DTO Classes

export type LogoutDto = z.infer<typeof LogoutSchema>;

export type LogoutResponseDto = z.infer<typeof LogoutResponseSchema>;
