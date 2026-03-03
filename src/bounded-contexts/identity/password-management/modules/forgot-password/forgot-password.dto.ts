import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Response Schema
const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class ForgotPasswordResponseDto extends createZodDto(ForgotPasswordResponseSchema) {}
