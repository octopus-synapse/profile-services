import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const TechNicheSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  areaId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechNicheListDataSchema = z.object({
  items: z.array(TechNicheSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class TechNicheDataDto extends createZodDto(TechNicheSchema) {}
export class TechNicheListDataDto extends createZodDto(TechNicheListDataSchema) {}
