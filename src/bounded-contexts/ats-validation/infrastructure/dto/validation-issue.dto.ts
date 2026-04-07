import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ValidationIssueSchema = z.object({
  severity: z.string(),
  category: z.string(),
  message: z.string(),
  location: z.string().optional(),
  suggestion: z.string().optional(),
});

export class ValidationIssueDto extends createZodDto(ValidationIssueSchema) {}
