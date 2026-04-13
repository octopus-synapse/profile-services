import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SpokenLanguageSchema = z.object({
  id: z.string(),
  code: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SpokenLanguageListDataSchema = z.object({
  items: z.array(SpokenLanguageSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class SpokenLanguageDataDto extends createZodDto(SpokenLanguageSchema) {}
export class SpokenLanguageListDataDto extends createZodDto(SpokenLanguageListDataSchema) {}
