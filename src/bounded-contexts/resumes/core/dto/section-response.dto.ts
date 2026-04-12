import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { SectionItemSchema } from './section-item-response.dto';
import { SectionTypeSchema } from './section-type-response.dto';

export const SectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
  sectionType: SectionTypeSchema,
  items: z.array(SectionItemSchema),
});

export class ResumeSectionResponseDto extends createZodDto(SectionSchema) {}
