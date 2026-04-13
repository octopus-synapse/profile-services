import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const TechAreaSchema = z.object({
  id: z.string(),
  type: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechAreaListDataSchema = z.object({
  items: z.array(TechAreaSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class TechAreaDataDto extends createZodDto(TechAreaSchema) {}
export class TechAreaListDataDto extends createZodDto(TechAreaListDataSchema) {}
