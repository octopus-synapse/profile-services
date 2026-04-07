import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ImportStatusEnumSchema } from './import-result.dto';
import { ParsedResumeDataSchema } from './parsed-resume-data.dto';

export const ImportSourceEnumSchema = z.enum(['LINKEDIN', 'PDF', 'DOCX', 'JSON', 'GITHUB']);

export const ImportJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: ImportSourceEnumSchema,
  status: ImportStatusEnumSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  parsedData: ParsedResumeDataSchema.optional(),
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export class ImportJobDto extends createZodDto(ImportJobSchema) {}
