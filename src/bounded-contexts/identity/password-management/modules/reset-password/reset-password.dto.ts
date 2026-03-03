import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// Response Schema
const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class ResetPasswordResponseDto extends createZodDto(ResetPasswordResponseSchema) {}
