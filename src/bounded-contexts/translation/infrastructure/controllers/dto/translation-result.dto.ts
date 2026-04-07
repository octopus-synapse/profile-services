import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});

export class TranslationResultDto extends createZodDto(TranslationResultSchema) {}
