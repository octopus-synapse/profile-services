import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { JsonResumeSchema } from './json-resume-schema.dto';

export const ImportJsonRequestSchema = z.object({
  data: JsonResumeSchema,
});

export class ImportJsonDto extends createZodDto(ImportJsonRequestSchema) {}
