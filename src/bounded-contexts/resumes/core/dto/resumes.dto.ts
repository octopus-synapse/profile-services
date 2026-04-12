/**
 * Resumes DTOs
 *
 * Request and Response DTOs for resume CRUD operations.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const SectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  semanticKind: z.string().optional(),
  title: z.string().optional(),
  version: z.number().int().optional(),
});

const SectionItemSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  content: z.record(z.unknown()).optional(),
});

const SectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
  sectionType: SectionTypeSchema,
  items: z.array(SectionItemSchema),
});

const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

const CreateResumeRequestSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().max(2000).optional(),
  template: z.string().optional(),
  isPublic: z.boolean().optional(),
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  emailContact: z.string().email().optional(),
  location: z.string().max(100).optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  website: z.string().url().optional(),
  sections: z.array(z.record(z.unknown())).optional(),
});

const UpdateResumeRequestSchema = CreateResumeRequestSchema.partial();

// ============================================================================
// Response Schemas
// ============================================================================

const ResumeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().optional(),
  targetRole: z.string().optional(),
  isPublic: z.boolean(),
  slug: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: z.string().datetime().optional(),
});

const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

const ResumeFullResponseSchema = ResumeResponseSchema.extend({
  resumeSections: z.array(SectionSchema),
  activeThemeId: z.string().optional(),
  activeTheme: ThemeSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

const PaginationMetaSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const PaginatedResumesDataSchema = z.object({
  data: z.array(ResumeListItemSchema),
  meta: PaginationMetaSchema,
});

// ============================================================================
// Request DTOs
// ============================================================================

export class CreateResumeRequestDto extends createZodDto(CreateResumeRequestSchema) {}
export class UpdateResumeRequestDto extends createZodDto(UpdateResumeRequestSchema) {}

// ============================================================================
// Response DTOs
// ============================================================================

export class ResumeResponseDto extends createZodDto(ResumeResponseSchema) {}
export class ResumeListItemDto extends createZodDto(ResumeListItemSchema) {}
export class ResumeSlotsResponseDto extends createZodDto(ResumeSlotsResponseSchema) {}
export class ResumeFullResponseDto extends createZodDto(ResumeFullResponseSchema) {}
export class DeleteResponseDto extends createZodDto(DeleteResponseSchema) {}
export class PaginatedResumesDataDto extends createZodDto(PaginatedResumesDataSchema) {}

// Also export nested DTOs for type inference
export class ResumeSectionTypeResponseDto extends createZodDto(SectionTypeSchema) {}
export class ResumeSectionItemResponseDto extends createZodDto(SectionItemSchema) {}
export class ResumeSectionResponseDto extends createZodDto(SectionSchema) {}
export class ResumeThemeResponseDto extends createZodDto(ThemeSchema) {}
