import { z } from 'zod';
import { ResumeTemplateSchema } from '../../enums';

/**
 * Resume Types
 *
 * Core resume entity types shared between frontend and backend.
 * Uses generic sections model - all content is stored in SectionItem.content.
 */

// ============================================================================
// Generic Resume Section Schemas
// ============================================================================

/**
 * Section Type - references SectionType from database
 */
export const ResumeSectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  semanticKind: z.string().nullable().optional(),
  title: z.string().optional(),
  version: z.number().int().optional(),
});

export type ResumeSectionType = z.infer<typeof ResumeSectionTypeSchema>;

/**
 * Section Item - generic container for any section content
 */
export const ResumeSectionItemSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  isVisible: z.boolean().default(true),
  content: z.record(z.unknown()),
});

export type ResumeSectionItem = z.infer<typeof ResumeSectionItemSchema>;

/**
 * Resume Section - groups items of the same type
 */
export const ResumeSectionSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  isVisible: z.boolean().default(true),
  titleOverride: z.string().nullable().optional(),
  sectionType: ResumeSectionTypeSchema,
  items: z.array(ResumeSectionItemSchema).default([]),
});

export type ResumeSection = z.infer<typeof ResumeSectionSchema>;

// ============================================================================
// Resume Schema
// ============================================================================

/**
 * Complete Resume Schema
 */
export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable(),
  template: ResumeTemplateSchema,
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Personal info
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  emailContact: z.string().email().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().url().nullable(),
  github: z.string().url().nullable(),
  website: z.string().url().nullable(),

  // Theme
  activeThemeId: z.string().uuid().nullable(),

  // Sections
  resumeSections: z.array(ResumeSectionSchema).default([]),
});

export type Resume = z.infer<typeof ResumeSchema>;

/**
 * Resume List Item (without sections)
 */
export const ResumeListItemSchema = ResumeSchema.omit({
  resumeSections: true,
});

export type ResumeListItem = z.infer<typeof ResumeListItemSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const ResumeResponseSchema = z.object({
  data: z.object({
    resume: ResumeSchema,
  }),
});

export type ResumeResponseEnvelope = z.infer<typeof ResumeResponseSchema>;

export const ResumeListResponseSchema = z.object({
  data: z.object({
    resumes: z.array(ResumeListItemSchema),
  }),
  meta: z
    .object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

export type ResumeListResponseEnvelope = z.infer<typeof ResumeListResponseSchema>;

export const ResumeSlotsResponseSchema = z.object({
  data: z.object({
    remaining: z.number(),
    total: z.number(),
    used: z.number(),
  }),
});

export type ResumeSlotsResponseEnvelope = z.infer<typeof ResumeSlotsResponseSchema>;

/**
 * Generic section response - works with any section type
 */
export const SectionResponseSchema = z.object({
  data: z.object({
    section: ResumeSectionSchema,
  }),
});

export type SectionResponseEnvelope = z.infer<typeof SectionResponseSchema>;

export const SectionListResponseSchema = z.object({
  data: z.object({
    sections: z.array(ResumeSectionSchema),
  }),
});

export type SectionListResponseEnvelope = z.infer<typeof SectionListResponseSchema>;

/**
 * Section item response
 */
export const SectionItemResponseSchema = z.object({
  data: z.object({
    item: ResumeSectionItemSchema,
  }),
});

export type SectionItemResponseEnvelope = z.infer<typeof SectionItemResponseSchema>;

export const SectionItemListResponseSchema = z.object({
  data: z.object({
    items: z.array(ResumeSectionItemSchema),
  }),
});

export type SectionItemListResponseEnvelope = z.infer<typeof SectionItemListResponseSchema>;
