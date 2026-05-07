/**
 * Route descriptors for the resumes/core BC. Replaces every endpoint
 * in `ResumesController` (including the SVG thumbnail), the entire
 * `ResumeManagementController`, and the entire
 * `GenericResumeSectionsController`. The SVG endpoint uses
 * `route.headers` for the `image/svg+xml` Content-Type and lets the
 * handler return the SVG string directly.
 *
 * Three bundles drive these routes:
 *  - `ResumesUseCases` for resume CRUD + slot lookup.
 *  - `ResumeManagementUseCases` for elevated admin-style ops.
 *  - `GenericResumeSectionsUseCases` for nested resume sections.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─────────────────────────────────────────────────────────────────────
// Common schemas
// ─────────────────────────────────────────────────────────────────────

export const PageLimitQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const _IdParam = IdParamSchema;
export const UserIdParam = z.object({ userId: z.string() });
export const ResumeIdParam = z.object({ resumeId: z.string() });
export const ResumeIdAndTypeKeyParam = z.object({
  resumeId: z.string(),
  sectionTypeKey: z.string(),
});
export const ResumeIdAndTypeKeyAndItemIdParam = z.object({
  resumeId: z.string(),
  sectionTypeKey: z.string(),
  itemId: z.string(),
});

export const LocaleQuery = z.object({ locale: z.string().optional() });

export const CreateResumeBody = z.object({
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

export const UpdateResumeBody = CreateResumeBody.partial();

export const SectionItemBody = z.object({
  content: z.record(z.unknown()).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value: leaf | array of leaves | object of leaves.
// Two levels deep covers the section item content shapes.
export const JsonObjectSchema = z
  .record(z.string(), z.unknown())
  .openapi({ example: { fields: [], translations: {} } });

export const ResumeBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().optional(),
  targetRole: z.string().optional(),
  isPublic: z.boolean(),
  slug: z.string().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const ResumeListItemSchema = ResumeBaseSchema;

export const PaginatedResumesResponseSchema = z.object({
  items: z.array(ResumeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

export const ResumeSectionItemSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  content: JsonObjectSchema.optional(),
});

export const ResumeSectionTypeRefSchema = z.object({
  id: z.string(),
  key: z.string(),
  semanticKind: z.string().optional(),
  title: z.string().optional(),
  version: z.number().int().optional(),
});

export const ResumeSectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
  sectionType: ResumeSectionTypeRefSchema,
  items: z.array(ResumeSectionItemSchema),
});

export const ResumeStyleRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const ResumeFullResponseSchema = ResumeBaseSchema.extend({
  resumeSections: z.array(ResumeSectionSchema),
  styleId: z.string().optional(),
  style: ResumeStyleRefSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

export const DeleteResumeResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

// Resume management responses (use Prisma-shaped data).
// Date fields are serialized to ISO strings by the response serializer.
export const MgmtSectionTypeSchema = z.object({
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
  definition: JsonObjectSchema.nullable(),
  uiSchema: JsonObjectSchema.nullable(),
  renderHints: JsonObjectSchema.nullable(),
  fieldStyles: JsonObjectSchema.nullable(),
  iconType: z.string(),
  icon: z.string(),
  translations: JsonObjectSchema.nullable(),
  examples: JsonObjectSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const MgmtSectionItemSchema = z.object({
  id: z.string(),
  resumeSectionId: z.string(),
  content: JsonObjectSchema.nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const MgmtResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  sectionType: MgmtSectionTypeSchema,
  items: z.array(MgmtSectionItemSchema),
});

export const MgmtResumeListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  styleId: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  resumeSections: z.array(MgmtResumeSectionSchema),
  _count: z.object({ resumeSections: z.number().int() }),
});

export const MgmtResumeListResponseSchema = z.object({
  resumes: z.array(MgmtResumeListItemSchema),
});

export const MgmtResumeDetailsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  styleId: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  resumeSections: z.array(MgmtResumeSectionSchema),
});

export const MgmtResumeDetailsResponseSchema = z.object({
  resume: MgmtResumeDetailsSchema,
});

export const MgmtResumeMessageResponseSchema = z.object({
  message: z.string(),
});

// Generic resume sections responses
export const ResolvedSectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  semanticKind: z.string(),
  version: z.number().int(),
  title: z.string(),
  description: z.string(),
  label: z.string(),
  noDataLabel: z.string(),
  placeholder: z.string(),
  addLabel: z.string(),
  iconType: z.string(),
  icon: z.string(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int().nullable(),
  maxItems: z.number().int().nullable(),
  definition: JsonObjectSchema,
  uiSchema: JsonObjectSchema.nullable(),
  renderHints: JsonObjectSchema,
  fieldStyles: JsonObjectSchema,
});

export const ResumeSectionTypesDataSchema = z.object({
  sectionTypes: z.array(ResolvedSectionTypeSchema),
});

// Generic sections list (used by /v1/resumes/:resumeId/sections)
export const GenericResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  sectionType: MgmtSectionTypeSchema.nullable(),
  items: z.array(MgmtSectionItemSchema),
});

export const ResumeSectionsListResponseSchema = z.object({
  sections: z.array(GenericResumeSectionSchema),
});

export const ResumeSectionItemDataResponseSchema = z.object({
  item: MgmtSectionItemSchema,
});

export const ResumeSectionItemDeletedResponseSchema = z.object({
  deleted: z.boolean(),
});

// ─────────────────────────────────────────────────────────────────────
// Resumes (CRUD)
// ─────────────────────────────────────────────────────────────────────
