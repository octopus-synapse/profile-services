import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutAllSessions: z.boolean().default(false),
});

// Response Schema
const LogoutResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class LogoutDto extends createZodDto(LogoutSchema) {}
export class LogoutResponseDto extends createZodDto(LogoutResponseSchema) {}
