import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TemplateSelectionSchema = z.object({
  templateId: z.string().optional(),
  colorScheme: z.string().optional(),
});

export class TemplateSelectionDto extends createZodDto(TemplateSelectionSchema) {}
