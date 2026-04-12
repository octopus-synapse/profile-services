import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ValidationIssueSchema } from './validation-issue.dto';
import { ValidationMetadataSchema } from './validation-metadata.dto';

export const ValidationResponseSchema = z.object({
  isValid: z.boolean(),
  score: z.number().int(),
  issues: z.array(ValidationIssueSchema),
  suggestions: z.array(z.string()),
  metadata: ValidationMetadataSchema,
});

export class ValidationResponseDto extends createZodDto(ValidationResponseSchema) {}
