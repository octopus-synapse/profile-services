import { z } from 'zod';

export const TemplateSelectionSchema = z.object({
  templateId: z.string().optional(),
  colorScheme: z.string().optional(),
});

export type TemplateSelectionDto = z.infer<typeof TemplateSelectionSchema>;
