import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Response Schema
const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  userId: z.string(),
});

// DTO Classes
export class LoginDto extends createZodDto(LoginSchema) {}
export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
