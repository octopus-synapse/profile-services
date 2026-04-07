import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SectionItemSchema } from './section-item.dto';

export const SectionProgressSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(SectionItemSchema).optional(),
  noData: z.boolean().optional(),
});

export class SectionProgressDto extends createZodDto(SectionProgressSchema) {}
