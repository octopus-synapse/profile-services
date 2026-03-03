import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// Response Schema
const ChangePasswordResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
export class ChangePasswordResponseDto extends createZodDto(ChangePasswordResponseSchema) {}
