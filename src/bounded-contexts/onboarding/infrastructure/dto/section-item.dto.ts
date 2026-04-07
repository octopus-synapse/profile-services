import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SectionItemSchema = z.object({
  id: z.string().optional(),
  content: z.record(z.unknown()).optional(),
});

export class SectionItemDto extends createZodDto(SectionItemSchema) {}
