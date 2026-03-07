/**
 * Resume Import DTOs
 *
 * Domain types and validation schemas for importing resumes from external formats
 * (PDF, DOCX, LinkedIn, etc.).
 *
 * ARCHITECTURE NOTE (GENERIC SECTIONS):
 * The Imported* schemas exist ONLY for parsing external data sources.
 * After parsing, data is converted to the generic ParsedSectionSchema format.
 * Internal storage and processing use the generic SectionItem.content model.
 */

import { z } from 'zod';

// ============================================================================
// Import Enums
// ============================================================================

export const ImportStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export type ImportStatus = z.infer<typeof ImportStatusSchema>;

export const ImportSourceSchema = z.enum(['JSON', 'PDF', 'DOCX', 'LINKEDIN']);
export type ImportSource = z.infer<typeof ImportSourceSchema>;

// ============================================================================
// Import Request
// ============================================================================

export const ImportResumeRequestSchema = z.object({
  targetResumeId: z.string().cuid().optional(),
  autoMerge: z.boolean().default(false),
});

export type ImportResumeRequest = z.infer<typeof ImportResumeRequestSchema>;

// ============================================================================
// Parsed Data Structure (Generic Sections)
// ============================================================================

export const ImportedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

export type ImportedPersonalInfo = z.infer<typeof ImportedPersonalInfoSchema>;

/**
 * Generic parsed section - maps to SectionType key + content items.
 */
export const ParsedSectionSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(z.record(z.unknown())),
});

export type ParsedSection = z.infer<typeof ParsedSectionSchema>;

export const ImportedResumeDataSchema = z.object({
  personalInfo: ImportedPersonalInfoSchema.optional(),
  sections: z.array(ParsedSectionSchema).optional(),
});

export type ImportedResumeData = z.infer<typeof ImportedResumeDataSchema>;

// ============================================================================
// Import Result
// ============================================================================

export const ImportResultSchema = z.object({
  success: z.boolean(),
  resumeId: z.string().cuid(),
  data: ImportedResumeDataSchema,
  warnings: z.array(z.string()).optional(),
});

export type ImportResult = z.infer<typeof ImportResultSchema>;

// ============================================================================
// Import Job (for tracking import status)
// ============================================================================

export const ImportJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: ImportSourceSchema,
  status: ImportStatusSchema,
  fileName: z.string().optional(),
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ImportJob = z.infer<typeof ImportJobSchema>;

// ============================================================================
// Parsed Resume Data (generic sections format for import preview)
// ============================================================================

export const ParsedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

export type ParsedPersonalInfo = z.infer<typeof ParsedPersonalInfoSchema>;

export const ParsedResumeDataSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionSchema),
});

export type ParsedResumeData = z.infer<typeof ParsedResumeDataSchema>;
