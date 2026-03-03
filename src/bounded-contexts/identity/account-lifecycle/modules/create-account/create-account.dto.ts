import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const CreateAccountSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

// Response Schema
const CreateAccountResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  message: z.string(),
});

// DTO Classes
export class CreateAccountDto extends createZodDto(CreateAccountSchema) {}
export class CreateAccountResponseDto extends createZodDto(CreateAccountResponseSchema) {}
