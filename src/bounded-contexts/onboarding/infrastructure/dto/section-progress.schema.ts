import { z } from 'zod';
import { SectionItemSchema } from './section-item.schema';

export const SectionProgressSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(SectionItemSchema).optional(),
  noData: z.boolean().optional(),
});

export type SectionProgressDto = z.infer<typeof SectionProgressSchema>;
