import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

// Response Schema
const VerifyEmailResponseSchema = z.object({
  email: z.string(),
  message: z.string(),
});

// DTO Classes
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
export class VerifyEmailResponseDto extends createZodDto(VerifyEmailResponseSchema) {}
