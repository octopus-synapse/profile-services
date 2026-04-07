import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ImportStatusEnumSchema = z.enum([
  'PENDING', 'PROCESSING', 'MAPPING', 'VALIDATING',
  'IMPORTING', 'COMPLETED', 'FAILED', 'PARTIAL',
]);

export const ImportResultSchema = z.object({
  importId: z.string(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export class ImportResultDto extends createZodDto(ImportResultSchema) {}
