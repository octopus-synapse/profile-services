import { z } from 'zod';

import { ResumeListItemSchema } from './resume-list-item.schema';

export const PaginatedResumesDataSchema = z.object({
  items: z.array(ResumeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginatedResumesDataDto = z.infer<typeof PaginatedResumesDataSchema>;
