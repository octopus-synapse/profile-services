import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { FailedTranslationSchema } from './failed-translation.dto';
import { TranslationResultSchema } from './translation-result.dto';

export const BatchTranslationResultSchema = z.object({
  translations: z.array(TranslationResultSchema),
  failed: z.array(FailedTranslationSchema),
});

export class BatchTranslationResultDto extends createZodDto(BatchTranslationResultSchema) {}
