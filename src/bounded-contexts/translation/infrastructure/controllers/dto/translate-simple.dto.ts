import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TranslateSimpleSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export class TranslateSimpleDto extends createZodDto(TranslateSimpleSchema) {}
