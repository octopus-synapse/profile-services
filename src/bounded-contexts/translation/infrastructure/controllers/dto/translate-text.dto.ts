import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslateTextSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});

export class TranslateTextDto extends createZodDto(TranslateTextSchema) {}
