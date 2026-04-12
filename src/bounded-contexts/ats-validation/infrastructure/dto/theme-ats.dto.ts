/**
 * Theme ATS Scoring DTOs
 *
 * Request and Response DTOs for theme ATS score endpoints.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for individual score criteria breakdown
 */
const ThemeATSCriterionScoreSchema = z.object({
  score: z.number().int().min(0).describe('Score achieved for this criterion'),
  maxScore: z.number().int().min(0).describe('Maximum possible score for this criterion'),
  details: z.string().describe('Explanation of the score'),
});

/**
 * Schema for complete score breakdown
 */
const ThemeATSScoreBreakdownSchema = z.object({
  layout: ThemeATSCriterionScoreSchema.describe('Layout type scoring (single vs two-column)'),
  typography: ThemeATSCriterionScoreSchema.describe('Font safety for ATS parsers'),
  colorContrast: ThemeATSCriterionScoreSchema.describe('Text/background contrast'),
  visualElements: ThemeATSCriterionScoreSchema.describe('Shadows, borders, gradients'),
  sectionOrder: ThemeATSCriterionScoreSchema.describe('Section ordering alignment'),
  paperSize: ThemeATSCriterionScoreSchema.describe('Paper format compatibility'),
  margins: ThemeATSCriterionScoreSchema.describe('Margin settings'),
  density: ThemeATSCriterionScoreSchema.describe('Content spacing/density'),
});

/**
 * Schema for theme ATS score response
 */
const ThemeATSScoreResponseSchema = z.object({
  themeId: z.string().describe('Unique identifier of the theme'),
  themeName: z.string().describe('Display name of the theme'),
  overallScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Overall ATS compatibility score (0-100)'),
  isATSFriendly: z.boolean().describe('Whether the theme is considered ATS-friendly (score >= 80)'),
  breakdown: ThemeATSScoreBreakdownSchema.describe('Detailed score breakdown by criteria'),
  recommendations: z.array(z.string()).describe('Suggestions to improve ATS compatibility'),
});

// ============================================================================
// DTOs
// ============================================================================

export class ThemeATSCriterionScoreDto extends createZodDto(ThemeATSCriterionScoreSchema) {}
export class ThemeATSScoreBreakdownDto extends createZodDto(ThemeATSScoreBreakdownSchema) {}
export class ThemeATSScoreResponseDto extends createZodDto(ThemeATSScoreResponseSchema) {}

// Export schemas for validation
export { ThemeATSCriterionScoreSchema, ThemeATSScoreBreakdownSchema, ThemeATSScoreResponseSchema };
