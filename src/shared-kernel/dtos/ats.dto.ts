import { z } from "zod";

export const ValidateCVSchema = z.object({
 checkFormat: z.boolean().optional(),
 checkSections: z.boolean().optional(),
 checkGrammar: z.boolean().optional(),
 checkOrder: z.boolean().optional(),
 checkLayout: z.boolean().optional(),
});

export type ValidateCV = z.infer<typeof ValidateCVSchema>;

/**
 * Validation Issue Severity/Type Enum
 * Unified to support both "severity" and "type" naming
 */
export const ValidationIssueSeverityEnum = z.enum([
 "error",
 "warning",
 "info",
 "suggestion",
]);
export type ValidationIssueSeverity = z.infer<
 typeof ValidationIssueSeverityEnum
>;

/**
 * Validation Issue Schema
 * Supports both frontend (severity, suggestion) and backend (type, location) fields
 */
export const ValidationIssueSchema = z.object({
 severity: ValidationIssueSeverityEnum,
 type: ValidationIssueSeverityEnum.optional(), // Alias for severity (backward compat)
 category: z.string(),
 message: z.string(),
 location: z.string().optional(), // Where in the document the issue was found
 suggestion: z.string().optional(), // How to fix the issue
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ValidationResponseSchema = z.object({
 isValid: z.boolean(),
 score: z.number(),
 issues: z.array(ValidationIssueSchema),
 suggestions: z.array(z.string()),
 metadata: z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  analyzedAt: z.string(),
 }),
});

export type ValidationResponse = z.infer<typeof ValidationResponseSchema>;

/**
 * Validation (alias for ValidationResponse)
 * For backward compatibility
 */
export type Validation = ValidationResponse;

/**
 * ATS Validation Result Schema (Frontend-compatible format)
 * Matches the structure expected by profile-frontend
 */
export const ATSValidationResultSchema = z.object({
 score: z.number().min(0).max(100),
 issues: z.array(ValidationIssueSchema),
 summary: z.object({
  total: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  info: z.number().int().nonnegative(),
 }),
 recommendations: z.array(z.string()),
});

export type ATSValidationResult = z.infer<typeof ATSValidationResultSchema>;

// Backward compatibility alias
export type ValidationResult = ATSValidationResult;
export const ValidationResultSchema = ATSValidationResultSchema;

/**
 * Validation Options (Frontend-compatible format)
 */
export const ValidateOptionsSchema = z.object({
 checkFormat: z.boolean().optional(),
 checkSections: z.boolean().optional(),
 checkGrammar: z.boolean().optional(),
 checkOrder: z.boolean().optional(),
 checkLayout: z.boolean().optional(),
});

export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;

// Alias for backward compatibility
export type ValidateCVOptions = ValidateOptions;
