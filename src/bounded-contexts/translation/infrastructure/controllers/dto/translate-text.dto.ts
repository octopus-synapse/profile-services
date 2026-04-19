import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslateTextSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
  targetLanguage: z.enum(['pt', 'en']),
});

export class TranslateTextDto extends createZodDto(TranslateTextSchema) {}
