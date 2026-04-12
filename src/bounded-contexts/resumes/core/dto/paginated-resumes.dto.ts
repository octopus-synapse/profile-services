import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ResumeListItemSchema } from './resume-list-item.dto';

const PaginationMetaSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

export const PaginatedResumesDataSchema = z.object({
  data: z.array(ResumeListItemSchema),
  meta: PaginationMetaSchema,
});

export class PaginatedResumesDataDto extends createZodDto(PaginatedResumesDataSchema) {}
