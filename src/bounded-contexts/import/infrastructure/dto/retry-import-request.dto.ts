import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RetryImportRequestSchema = z.object({
  force: z.boolean().default(false).optional(),
});

export class RetryImportRequestDto extends createZodDto(RetryImportRequestSchema) {}
