import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Request Schema
const DeleteAccountSchema = z.object({
  confirmationPhrase: z.string().min(1),
});

// Response Schema
const DeleteAccountResponseSchema = z.object({
  message: z.string(),
});

// DTO Classes
export class DeleteAccountDto extends createZodDto(DeleteAccountSchema) {}
export class DeleteAccountResponseDto extends createZodDto(DeleteAccountResponseSchema) {}
