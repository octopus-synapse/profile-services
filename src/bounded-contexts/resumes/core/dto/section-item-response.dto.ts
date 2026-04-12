import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SectionItemSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  content: z.record(z.unknown()).optional(),
});

export class ResumeSectionItemResponseDto extends createZodDto(SectionItemSchema) {}
