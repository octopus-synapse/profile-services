import { z } from 'zod';

import { SectionItemSchema } from './section-item-response.schema';
import { SectionTypeSchema } from './section-type-response.schema';

export const SectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
  sectionType: SectionTypeSchema,
  items: z.array(SectionItemSchema),
});

export type SectionDto = z.infer<typeof SectionSchema>;
