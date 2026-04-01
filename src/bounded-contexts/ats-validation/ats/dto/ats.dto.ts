/**
 * ATS Validation DTOs
 *
 * Request and Response DTOs for ATS validation endpoints.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

const ValidateCVOptionsSchema = z.object({
  checkFormat: z.coerce.boolean().default(true).optional(),
  checkSections: z.coerce.boolean().default(true).optional(),
  checkGrammar: z.coerce.boolean().default(false).optional(),
  checkOrder: z.coerce.boolean().default(true).optional(),
  checkLayout: z.coerce.boolean().default(true).optional(),
  resumeId: z.string().optional(),
  checkSemantic: z.coerce.boolean().default(true).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const ValidationIssueSchema = z.object({
  severity: z.string(),
  category: z.string(),
  message: z.string(),
  location: z.string().optional(),
  suggestion: z.string().optional(),
});

const ValidationMetadataSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  analyzedAt: z.string().datetime(),
  semanticScore: z.number().optional(),
});

const ValidationResponseSchema = z.object({
  isValid: z.boolean(),
  score: z.number().int(),
  issues: z.array(ValidationIssueSchema),
  suggestions: z.array(z.string()),
  metadata: ValidationMetadataSchema,
});

const ATSValidationIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.string(),
});

const ATSValidationResponseSchema = z.object({
  score: z.number().int(),
  issues: z.array(ATSValidationIssueSchema),
  suggestions: z.array(z.string()),
  isATSCompatible: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

// Request DTOs
export class ValidateCVOptionsDto extends createZodDto(ValidateCVOptionsSchema) {}

// Response DTOs
export class ValidationIssueDto extends createZodDto(ValidationIssueSchema) {}
export class ValidationMetadataDto extends createZodDto(ValidationMetadataSchema) {}
export class ValidationResponseDto extends createZodDto(ValidationResponseSchema) {}
export class ATSValidationIssueDto extends createZodDto(ATSValidationIssueSchema) {}
export class ATSValidationResponseDto extends createZodDto(ATSValidationResponseSchema) {}

// Export schemas for validation
export { ATSValidationResponseSchema, ValidateCVOptionsSchema, ValidationResponseSchema };
