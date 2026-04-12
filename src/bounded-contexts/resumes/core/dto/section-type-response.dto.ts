import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  semanticKind: z.string().optional(),
  title: z.string().optional(),
  version: z.number().int().optional(),
});

export class ResumeSectionTypeResponseDto extends createZodDto(SectionTypeSchema) {}
