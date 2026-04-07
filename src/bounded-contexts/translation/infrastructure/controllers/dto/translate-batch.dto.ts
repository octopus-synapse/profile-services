import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslateBatchSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});

export class TranslateBatchDto extends createZodDto(TranslateBatchSchema) {}
