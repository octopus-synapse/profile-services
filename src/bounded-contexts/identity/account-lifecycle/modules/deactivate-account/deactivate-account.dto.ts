import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const DeactivateAccountSchema = z.object({
  reason: z.string().optional(),
});

// Response Schema
const DeactivateAccountResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class DeactivateAccountDto extends createZodDto(DeactivateAccountSchema) {}
export class DeactivateAccountResponseDto extends createZodDto(DeactivateAccountResponseSchema) {}
