import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  isPublic: z.boolean().optional(),
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: IsoDateTimeSchema.optional(),
});

const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

const ResumeFullResponseSchema = ResumeResponseSchema.extend({
  resumeSections: z.array(SectionSchema),
  styleId: z.string().optional(),
  style: ThemeSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

const DeleteResponseSchema = z.object({ deleted: z.boolean(), id: z.string() });

const PaginatedResumesDataSchema = z.object({
  items: z.array(ResumeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// ============================================================================
// Request DTOs
// ============================================================================
// ============================================================================
// Response DTOs
// ============================================================================
// Also export nested DTOs for type inference

export type SectionTypeDto = z.infer<typeof SectionTypeSchema>;

export type SectionItemDto = z.infer<typeof SectionItemSchema>;

export type SectionDto = z.infer<typeof SectionSchema>;

export type ThemeDto = z.infer<typeof ThemeSchema>;

export type CreateResumeRequestDto = z.infer<typeof CreateResumeRequestSchema>;

export type UpdateResumeRequestDto = z.infer<typeof UpdateResumeRequestSchema>;

export type ResumeResponseDto = z.infer<typeof ResumeResponseSchema>;

export type ResumeListItemDto = z.infer<typeof ResumeListItemSchema>;

export type ResumeSlotsResponseDto = z.infer<typeof ResumeSlotsResponseSchema>;

export type ResumeFullResponseDto = z.infer<typeof ResumeFullResponseSchema>;

export type DeleteResponseDto = z.infer<typeof DeleteResponseSchema>;

export type PaginatedResumesDataDto = z.infer<typeof PaginatedResumesDataSchema>;
