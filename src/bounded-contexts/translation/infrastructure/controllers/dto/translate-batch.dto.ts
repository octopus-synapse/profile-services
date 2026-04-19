import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslateBatchSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required'),
  sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
  targetLanguage: z.enum(['pt', 'en']),
});

export class TranslateBatchDto extends createZodDto(TranslateBatchSchema) {}
