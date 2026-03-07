/**
 * ATS Validation DTOs
 *
 * Domain types and validation schemas for ATS (Applicant Tracking System)
 * CV/Resume validation functionality.
 */

import { z } from 'zod';

// ============================================================================
// Validation Severity
// ============================================================================

export const ValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

/**
 * ValidationSeverity as TypeScript enum for NestJS compatibility
 */
export enum ValidationSeverityEnum {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// ============================================================================
// Validation Issue
// ============================================================================

export const ATSValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: ValidationSeveritySchema,
  location: z.string().optional(),
  suggestion: z.string().optional(),
});

export type ATSValidationIssue = z.infer<typeof ATSValidationIssueSchema>;

// ============================================================================
// Validation Result (Base)
// ============================================================================

export const ATSValidationResultBaseSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ATSValidationIssueSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type ATSValidationResultBase = z.infer<typeof ATSValidationResultBaseSchema>;

// ============================================================================
// Section Validation Result
// ============================================================================

export const SectionValidationResultSchema = ATSValidationResultBaseSchema.extend({
  detectedSections: z.array(z.string()),
  missingSections: z.array(z.string()),
});

export type SectionValidationResult = z.infer<typeof SectionValidationResultSchema>;

// ============================================================================
// Format Validation Result
// ============================================================================

export const FormatValidationResultSchema = ATSValidationResultBaseSchema.extend({
  fileType: z.string(),
  fileSize: z.number().int().nonnegative(),
  isATSCompatible: z.boolean(),
});

export type FormatValidationResult = z.infer<typeof FormatValidationResultSchema>;

// ============================================================================
// Text Extraction Result
// ============================================================================

export const TextExtractionResultSchema = ATSValidationResultBaseSchema.extend({
  extractedText: z.string(),
  wordCount: z.number().int().nonnegative(),
  isEmpty: z.boolean(),
  isImageBased: z.boolean(),
});

export type TextExtractionResult = z.infer<typeof TextExtractionResultSchema>;

// ============================================================================
// ATS Issue (Detailed) — Generic codes with contextual data
// ============================================================================

export const ATSIssueDetailedSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  context: z
    .object({
      sectionKind: z.string().optional(),
      missingFields: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ATSIssueDetailed = z.infer<typeof ATSIssueDetailedSchema>;

// ============================================================================
// ATS Section Score Breakdown — per-section, definition-driven
// ============================================================================

export const SectionScoreBreakdownSchema = z.object({
  sectionKind: z.string(),
  sectionTypeKey: z.string(),
  score: z.number().min(0).max(100),
});

export type SectionScoreBreakdown = z.infer<typeof SectionScoreBreakdownSchema>;

// ============================================================================
// ATS Score Result
// ============================================================================

export const ATSScoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  sectionBreakdown: z.array(SectionScoreBreakdownSchema),
  issues: z.array(ATSIssueDetailedSchema),
  recommendations: z.array(z.string()),
});

export type ATSScoreResult = z.infer<typeof ATSScoreResultSchema>;

// ============================================================================
// CV Section (for parsing) - Definition-Driven
// ============================================================================

/**
 * SemanticKind - Dynamic section type identifier.
 * Validated as non-empty string, actual values come from SectionType definitions.
 */
export const SemanticKindSchema = z.string().min(1).max(100);
export type SemanticKind = z.infer<typeof SemanticKindSchema>;

/**
 * CV Section schema with dynamic semantic kind.
 * The semanticKind value comes from SectionType.semanticKind.
 */
export const CVSectionSchema = z.object({
  /** Semantic kind from SectionType definitions. */
  semanticKind: SemanticKindSchema,
  title: z.string().optional(),
  content: z.string(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
  /** Detection confidence (0.0 - 1.0) */
  confidence: z.number().min(0).max(1).optional(),
});

export type CVSection = z.infer<typeof CVSectionSchema>;

// ============================================================================
// Parsed CV
// ============================================================================

export const ParsedCVSchema = z.object({
  sections: z.array(CVSectionSchema),
  rawText: z.string(),
  metadata: z.object({
    fileName: z.string(),
    fileType: z.string(),
    extractedAt: z.coerce.date(),
  }),
});

export type ParsedCV = z.infer<typeof ParsedCVSchema>;

// ============================================================================
// Service Validation Issue (for backend services - has 'code' field)
// ============================================================================

export const ServiceValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: ValidationSeveritySchema,
  location: z.string().optional(),
  suggestion: z.string().optional(),
});

export type ServiceValidationIssue = z.infer<typeof ServiceValidationIssueSchema>;

// ============================================================================
// Service Validation Result (for backend services)
// ============================================================================

export const ServiceValidationResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ServiceValidationIssueSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type ServiceValidationResult = z.infer<typeof ServiceValidationResultSchema>;

// ============================================================================
// Section Validation Result (for backend services)
// ============================================================================

export const ServiceSectionValidationResultSchema = ServiceValidationResultSchema.extend({
  detectedSections: z.array(z.string()),
  missingSections: z.array(z.string()),
});

export type ServiceSectionValidationResult = z.infer<typeof ServiceSectionValidationResultSchema>;
