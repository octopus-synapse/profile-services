import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { SeverityEnum } from './analytics-enums.dto';

export const ATSScoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  sectionBreakdown: z.array(
    z.object({
      sectionKind: z.string(),
      sectionTypeKey: z.string(),
      score: z.number().min(0).max(100),
    }),
  ),
  issues: z.array(
    z.object({
      code: z.string(),
      severity: SeverityEnum,
      message: z.string(),
      context: z
        .object({
          sectionKind: z.string().optional(),
          missingFields: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  ),
  recommendations: z.array(z.string()),
});

export class ATSScoreResponseDto extends createZodDto(ATSScoreResponseSchema) {}
