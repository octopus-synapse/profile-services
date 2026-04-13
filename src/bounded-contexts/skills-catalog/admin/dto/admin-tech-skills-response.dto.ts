import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const TechSkillSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  type: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  nicheId: z.string().nullable(),
  aliases: z.array(z.string()),
  keywords: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechSkillListDataSchema = z.object({
  items: z.array(TechSkillSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class TechSkillDataDto extends createZodDto(TechSkillSchema) {}
export class TechSkillListDataDto extends createZodDto(TechSkillListDataSchema) {}
