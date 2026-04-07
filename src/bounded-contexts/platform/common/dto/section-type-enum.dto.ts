import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SectionTypeSchema = z.object({
  key: z.string(),
  semanticKind: z.string(),
  title: z.string(),
});

const SectionTypesDataSchema = z.object({
  types: z.array(SectionTypeSchema),
});

export class SectionTypeResponseDto extends createZodDto(SectionTypeSchema) {}
export class SectionTypesDataDto extends createZodDto(SectionTypesDataSchema) {}
