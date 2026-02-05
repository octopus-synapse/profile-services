/**
 * DSL Response DTOs
 *
 * Domain types and validation schemas for DSL (Domain Specific Language)
 * validation, preview, and rendering responses.
 */

import { z } from "zod";

// Note: Full AST schema is available at ../ast/resume-ast.schema.ts
// Using z.unknown() here for flexibility, but can be replaced with full AST schema

// ============================================================================
// DSL Validation
// ============================================================================

export const DslValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).nullable(),
});

export type DslValidationResult = z.infer<typeof DslValidationResultSchema>;

// ============================================================================
// DSL Preview
// ============================================================================

export const DslPreviewResultSchema = z.object({
  ast: z.unknown(), // Can be replaced with ResumeASTSchema for full type safety
});

export type DslPreviewResult = z.infer<typeof DslPreviewResultSchema>;

// ============================================================================
// DSL Render
// ============================================================================

export const DslRenderResultSchema = z.object({
  ast: z.unknown(), // Can be replaced with ResumeASTSchema for full type safety
  resumeId: z.string().cuid().optional(),
  slug: z.string().optional(),
});

export type DslRenderResult = z.infer<typeof DslRenderResultSchema>;
