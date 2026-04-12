import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class HistoryQueryDto extends createZodDto(HistoryQuerySchema) {}
