/**
 * Resume Import DTOs
 *
 * Domain types and validation schemas for importing resumes from external formats
 * (PDF, DOCX, LinkedIn, etc.).
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

// Note: File upload itself is handled separately (multipart/form-data)
// This schema covers the metadata and options

export const ImportResumeRequestSchema = z.object({
  targetResumeId: z.string().cuid().optional(),
  autoMerge: z.boolean().default(false),
});

export type ImportResumeRequest = z.infer<typeof ImportResumeRequestSchema>;

// Alias for backward compatibility
export type ImportResumeDto = ImportResumeRequest;

// ============================================================================
// Parsed Data Structure
// ============================================================================

export const ImportedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

export type ImportedPersonalInfo = z.infer<typeof ImportedPersonalInfoSchema>;

export const ImportedExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export type ImportedExperience = z.infer<typeof ImportedExperienceSchema>;

export const ImportedEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ImportedEducation = z.infer<typeof ImportedEducationSchema>;

export const ImportedLanguageSchema = z.object({
  language: z.string(),
  proficiency: z.string().optional(),
});

export type ImportedLanguage = z.infer<typeof ImportedLanguageSchema>;

export const ImportedCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

export type ImportedCertification = z.infer<typeof ImportedCertificationSchema>;

export const ImportedResumeDataSchema = z.object({
  personalInfo: ImportedPersonalInfoSchema.optional(),
  experiences: z.array(ImportedExperienceSchema).optional(),
  education: z.array(ImportedEducationSchema).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(ImportedLanguageSchema).optional(),
  certifications: z.array(ImportedCertificationSchema).optional(),
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
// Parsed Resume Data (detailed version for import preview)
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

export const ParsedExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export type ParsedExperience = z.infer<typeof ParsedExperienceSchema>;

export const ParsedEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export type ParsedEducation = z.infer<typeof ParsedEducationSchema>;

export const ParsedCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});

export type ParsedCertification = z.infer<typeof ParsedCertificationSchema>;

export const ParsedSpokenLanguageSchema = z.object({
  name: z.string(),
  level: z.string().optional(),
});

export type ParsedSpokenLanguage = z.infer<typeof ParsedSpokenLanguageSchema>;

export const ParsedProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  technologies: z.array(z.string()).optional(),
});

export type ParsedProject = z.infer<typeof ParsedProjectSchema>;

export const ParsedResumeDataSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  experiences: z.array(ParsedExperienceSchema),
  education: z.array(ParsedEducationSchema),
  skills: z.array(z.string()),
  certifications: z.array(ParsedCertificationSchema).optional(),
  languages: z.array(ParsedSpokenLanguageSchema).optional(),
  projects: z.array(ParsedProjectSchema).optional(),
});

export type ParsedResumeData = z.infer<typeof ParsedResumeDataSchema>;
