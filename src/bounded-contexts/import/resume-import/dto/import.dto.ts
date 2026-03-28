/**
 * Resume Import DTOs
 *
 * Data Transfer Objects for resume import API.
 * Using createZodDto for unified validation + Swagger generation.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export type ImportSource = 'LINKEDIN' | 'PDF' | 'DOCX' | 'JSON' | 'GITHUB';
export type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

// ============================================================================
// JSON Resume Schemas (jsonresume.org standard)
// ============================================================================

const JsonResumeBasicsLocationSchema = z.object({
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

const JsonResumeProfileSchema = z.object({
  network: z.string().optional(),
  url: z.string().url().optional(),
  username: z.string().optional(),
});

const JsonResumeBasicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
  location: JsonResumeBasicsLocationSchema.optional(),
  profiles: z.array(JsonResumeProfileSchema).optional(),
});

const JsonResumeWorkSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const JsonResumeEducationSchema = z.object({
  institution: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
});

const JsonResumeSkillSchema = z.object({
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

const JsonResumeLanguageSchema = z.object({
  language: z.string().optional(),
  fluency: z.string().optional(),
});

const JsonResumeCertificateSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().url().optional(),
});

const JsonResumeProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
});

const JsonResumeSchema = z.object({
  basics: JsonResumeBasicsSchema,
  work: z.array(JsonResumeWorkSchema).optional(),
  education: z.array(JsonResumeEducationSchema).optional(),
  skills: z.array(JsonResumeSkillSchema).optional(),
  languages: z.array(JsonResumeLanguageSchema).optional(),
  certificates: z.array(JsonResumeCertificateSchema).optional(),
  projects: z.array(JsonResumeProjectSchema).optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

const ImportJsonRequestSchema = z.object({
  data: JsonResumeSchema,
});

const RetryImportRequestSchema = z.object({
  force: z.boolean().default(false).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const ImportStatusEnumSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'MAPPING',
  'VALIDATING',
  'IMPORTING',
  'COMPLETED',
  'FAILED',
  'PARTIAL',
]);

const ImportSourceEnumSchema = z.enum(['LINKEDIN', 'PDF', 'DOCX', 'JSON', 'GITHUB']);

const ImportResultSchema = z.object({
  importId: z.string(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

const ParsedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

const ParsedSectionSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(z.record(z.unknown())),
});

const ParsedResumeDataSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionSchema),
});

const ImportJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: ImportSourceEnumSchema,
  status: ImportStatusEnumSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  parsedData: ParsedResumeDataSchema.optional(),
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

// ============================================================================
// Request DTOs
// ============================================================================

export class ImportJsonDto extends createZodDto(ImportJsonRequestSchema) {}
export class RetryImportRequestDto extends createZodDto(RetryImportRequestSchema) {}

// ============================================================================
// Response DTOs
// ============================================================================

export class JsonResumeSchemaDto extends createZodDto(JsonResumeSchema) {}
export class ImportResultDto extends createZodDto(ImportResultSchema) {}
export class ParsedResumeDataDto extends createZodDto(ParsedResumeDataSchema) {}
export class ImportJobDto extends createZodDto(ImportJobSchema) {}
