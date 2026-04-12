import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MarkAsReadDataSchema = z.object({
  count: z.number().int(),
});

export class MarkAsReadDataDto extends createZodDto(MarkAsReadDataSchema) {}
