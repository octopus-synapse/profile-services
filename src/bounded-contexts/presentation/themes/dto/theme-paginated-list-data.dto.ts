import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemePaginationDataSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ThemePaginatedListDataSchema = z.object({
  themes: z.array(z.record(z.unknown())),
  pagination: ThemePaginationDataSchema,
});

export class ThemePaginationDataDto extends createZodDto(ThemePaginationDataSchema) {}
export class ThemePaginatedListDataDto extends createZodDto(ThemePaginatedListDataSchema) {}
