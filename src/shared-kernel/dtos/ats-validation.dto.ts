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

export type ATSValidationResultBase = z.infer<
  typeof ATSValidationResultBaseSchema
>;

// ============================================================================
// Section Validation Result
// ============================================================================

export const SectionValidationResultSchema =
  ATSValidationResultBaseSchema.extend({
    detectedSections: z.array(z.string()),
    missingSections: z.array(z.string()),
  });

export type SectionValidationResult = z.infer<
  typeof SectionValidationResultSchema
>;

// ============================================================================
// Format Validation Result
// ============================================================================

export const FormatValidationResultSchema =
  ATSValidationResultBaseSchema.extend({
    fileType: z.string(),
    fileSize: z.number().int().nonnegative(),
    isATSCompatible: z.boolean(),
  });

export type FormatValidationResult = z.infer<
  typeof FormatValidationResultSchema
>;

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
// ATS Issue Type
// ============================================================================

export const ATSIssueTypeSchema = z.enum([
  'missing_contact',
  'short_summary',
  'missing_skills',
  'no_experience',
  'missing_education',
  'weak_action_verbs',
  'no_quantified_achievements',
  'keyword_stuffing',
  'format_issue',
]);

export type ATSIssueType = z.infer<typeof ATSIssueTypeSchema>;

// ============================================================================
// ATS Issue (Detailed)
// ============================================================================

export const ATSIssueDetailedSchema = z.object({
  type: ATSIssueTypeSchema,
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  field: z.string().optional(),
});

export type ATSIssueDetailed = z.infer<typeof ATSIssueDetailedSchema>;

// ============================================================================
// ATS Score Breakdown
// ============================================================================

export const ATSScoreBreakdownSchema = z.object({
  keywords: z.number().min(0).max(100),
  format: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
});

export type ATSScoreBreakdown = z.infer<typeof ATSScoreBreakdownSchema>;

// ============================================================================
// ATS Score Result
// ============================================================================

export const ATSScoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: ATSScoreBreakdownSchema,
  issues: z.array(ATSIssueDetailedSchema),
  recommendations: z.array(z.string()),
});

export type ATSScoreResult = z.infer<typeof ATSScoreResultSchema>;

// ============================================================================
// CV Section (for parsing)
// ============================================================================

export const CVSectionTypeSchema = z.enum([
  'personal_info',
  'summary',
  'experience',
  'education',
  'skills',
  'certifications',
  'projects',
  'languages',
  'awards',
  'publications',
  'references',
  'interests',
  'other',
]);

export type CVSectionType = z.infer<typeof CVSectionTypeSchema>;

/**
 * CVSectionType as TypeScript enum for NestJS compatibility
 */
export enum CVSectionTypeEnum {
  PERSONAL_INFO = 'personal_info',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  CERTIFICATIONS = 'certifications',
  PROJECTS = 'projects',
  LANGUAGES = 'languages',
  AWARDS = 'awards',
  PUBLICATIONS = 'publications',
  REFERENCES = 'references',
  INTERESTS = 'interests',
  OTHER = 'other',
}

export const CVSectionSchema = z.object({
  type: CVSectionTypeSchema,
  title: z.string().optional(),
  content: z.string(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
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

export type ServiceValidationIssue = z.infer<
  typeof ServiceValidationIssueSchema
>;

// ============================================================================
// Service Validation Result (for backend services)
// ============================================================================

export const ServiceValidationResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ServiceValidationIssueSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type ServiceValidationResult = z.infer<
  typeof ServiceValidationResultSchema
>;

// ============================================================================
// Section Validation Result (for backend services)
// ============================================================================

export const ServiceSectionValidationResultSchema =
  ServiceValidationResultSchema.extend({
    detectedSections: z.array(z.string()),
    missingSections: z.array(z.string()),
  });

export type ServiceSectionValidationResult = z.infer<
  typeof ServiceSectionValidationResultSchema
>;
