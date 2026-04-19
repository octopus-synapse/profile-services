import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  detectedLanguage: z.string().optional(),
});

export class TranslationResultDto extends createZodDto(TranslationResultSchema) {}
