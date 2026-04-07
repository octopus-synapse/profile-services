import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ATSValidationIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.string(),
});

export const ATSValidationResponseSchema = z.object({
  score: z.number().int(),
  issues: z.array(ATSValidationIssueSchema),
  suggestions: z.array(z.string()),
  isATSCompatible: z.boolean(),
});

export class ATSValidationIssueDto extends createZodDto(ATSValidationIssueSchema) {}
export class ATSValidationResponseDto extends createZodDto(ATSValidationResponseSchema) {}
