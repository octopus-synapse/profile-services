import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const FailedTranslationSchema = z.object({
  text: z.string(),
  error: z.string(),
});

export class FailedTranslationDto extends createZodDto(FailedTranslationSchema) {}
