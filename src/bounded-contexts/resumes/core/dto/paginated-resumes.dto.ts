import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ResumeListItemSchema } from './resume-list-item.dto';

export const PaginatedResumesDataSchema = z.object({
  items: z.array(ResumeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export class PaginatedResumesDataDto extends createZodDto(PaginatedResumesDataSchema) {}
