import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const IssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  messageArgs: z.record(z.unknown()).optional(),
  freeformMessage: z.string().optional(),
  context: z
    .object({
      sectionKey: z.string().optional(),
      itemIndex: z.number().int().optional(),
      excerpt: z.string().optional(),
    })
    .optional(),
});

const ResumeQualityResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  overallScore: z.number().int().min(0).max(100),
  completenessScore: z
    .number()
    .int()
    .min(0)
    .max(100) /** `null` means the Content Quality path was disabled or failed;
   * clients should fall back to `completenessScore`. */,
  contentQualityScore: z.number().int().min(0).max(100).nullable(),
  issues: z.array(IssueSchema),
  scoringRulesVersion: z.string(),
  aiPromptVersion: z.string().nullable(),
  computedAt: IsoDateTimeSchema,
});

export class ResumeQualityResponseDto extends createZodDto(ResumeQualityResponseSchema) {}
