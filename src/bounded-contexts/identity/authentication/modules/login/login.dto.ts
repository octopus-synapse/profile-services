import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Request Schema for 2FA login verification
export const LoginVerify2faSchema = z.object({
  userId: z.string().min(1),
  code: z.string().min(6),
});

// Response Schema
const LoginResponseSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  userId: z.string(),
  twoFactorRequired: z.boolean().optional(),
});

// DTO Classes
export class LoginDto extends createZodDto(LoginSchema) {}
export class LoginVerify2faDto extends createZodDto(LoginVerify2faSchema) {}
export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
