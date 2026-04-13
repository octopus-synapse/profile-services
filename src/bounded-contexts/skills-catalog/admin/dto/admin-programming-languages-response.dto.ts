import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ProgrammingLanguageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  paradigms: z.array(z.string()),
  typing: z.string().nullable(),
  aliases: z.array(z.string()),
  fileExtensions: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProgrammingLanguageListDataSchema = z.object({
  items: z.array(ProgrammingLanguageSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class ProgrammingLanguageDataDto extends createZodDto(ProgrammingLanguageSchema) {}
export class ProgrammingLanguageListDataDto extends createZodDto(
  ProgrammingLanguageListDataSchema,
) {}
