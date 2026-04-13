/**
 * Resume Management Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Shared Sub-Schemas
// ============================================================================

const MgmtSectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  semanticKind: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int(),
  maxItems: z.number().int().nullable(),
  definition: z.unknown(),
  uiSchema: z.unknown().nullable(),
  renderHints: z.unknown(),
  fieldStyles: z.unknown(),
  iconType: z.string(),
  icon: z.string(),
  translations: z.unknown(),
  examples: z.unknown(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const MgmtSectionItemSchema = z.object({
  id: z.string(),
  resumeSectionId: z.string(),
  content: z.unknown(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const MgmtResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sectionType: MgmtSectionTypeSchema,
  items: z.array(MgmtSectionItemSchema),
});

// ============================================================================
// Resume List Item (includes sections + counts)
// ============================================================================

const MgmtResumeListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  template: z.string(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  activeThemeId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  resumeSections: z.array(MgmtResumeSectionSchema),
  _count: z.object({
    resumeSections: z.number().int(),
  }),
});

// ============================================================================
// Resume Details (includes user + sections)
// ============================================================================

const ResumeDetailsUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
});

const ResumeDetailsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  template: z.string(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  emailContact: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  activeThemeId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: ResumeDetailsUserSchema,
  resumeSections: z.array(MgmtResumeSectionSchema),
});

// ============================================================================
// Wrapper Schemas
// ============================================================================

const ResumeListDataSchema = z.object({
  resumes: z.array(MgmtResumeListItemSchema),
});

const ResumeDetailsDataSchema = z.object({
  resume: ResumeDetailsSchema,
});

const ResumeOperationMessageDataSchema = z.object({
  message: z.string(),
});

// ============================================================================
// DTOs
// ============================================================================

export class MgmtResumeListItemDto extends createZodDto(MgmtResumeListItemSchema) {}
export class ResumeDetailsDto extends createZodDto(ResumeDetailsSchema) {}
export class ResumeListDataDto extends createZodDto(ResumeListDataSchema) {}
export class ResumeDetailsDataDto extends createZodDto(ResumeDetailsDataSchema) {}
export class ResumeOperationMessageDataDto extends createZodDto(ResumeOperationMessageDataSchema) {}
