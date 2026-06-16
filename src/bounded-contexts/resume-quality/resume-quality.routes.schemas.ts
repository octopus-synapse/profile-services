/**
 * Schemas for the resume-quality BC. Extracted out of
 * `resume-quality.routes.ts` per Q47 in the duplication audit so this
 * BC follows the same shape as every other extracted route module.
 */

import { z } from 'zod';
import { ResumeIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ResumeIdParams = ResumeIdParamSchema;

export const QualityIssueContextSchema = z.object({
  sectionKey: z.string().optional(),
  itemIndex: z.number().int().optional(),
  excerpt: z.string().optional(),
});

export const QualityIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  /** Localised candidate-facing label rendered from `code` via the
   * QUALITY_ISSUE_DICTIONARY (request's Accept-Language). */
  message: z.string(),
  messageArgs: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  freeformMessage: z.string().optional(),
  context: QualityIssueContextSchema.optional(),
});

export const ResumeQualityResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string().uuid(),
  overallScore: z.number().int().min(0).max(100),
  completenessScore: z.number().int().min(0).max(100),
  contentQualityScore: z.number().int().min(0).max(100).nullable(),
  issues: z.array(QualityIssueSchema),
  scoringRulesVersion: z.string(),
  aiPromptVersion: z.string().nullable(),
  computedAt: IsoDateTimeSchema,
});
