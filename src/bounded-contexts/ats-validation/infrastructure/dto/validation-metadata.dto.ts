import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ValidationMetadataSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  analyzedAt: z.string().datetime(),
  semanticScore: z.number().optional(),
});

export class ValidationMetadataDto extends createZodDto(ValidationMetadataSchema) {}
