/**
 * Response schemas for the resume MANAGEMENT surface (`/v1/resumes/manage/...`).
 *
 * Split out of `resumes.routes.schemas.ts` when that file crossed the 500-line
 * ratchet: management, the public resume surface and generic sections are three
 * separate concerns that happened to share a file.
 *
 * These describe Prisma-shaped rows; date fields are serialized to ISO strings
 * by the response serializer.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { JsonObjectSchema } from '@/shared-kernel/schemas/primitives/json-object.schema';

// Resume management responses (use Prisma-shaped data).
// Date fields are serialized to ISO strings by the response serializer.
export const MgmtSectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  semanticKind: z.string(),
  /** See ResumeSectionTypeRefSchema.groupKey. */
  groupKey: z.string().nullable().optional(),
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
  resumeSectionId: z.string().uuid(),
  content: JsonObjectSchema.nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const MgmtResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string().uuid(),
  sectionTypeId: z.string().uuid(),
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
  userId: z.string().uuid(),
  title: z.string().nullable(),
  language: z.string(),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  accentColor: z.string().nullable(),
  styleId: z.string().uuid().nullable(),
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
  userId: z.string().uuid(),
  title: z.string().nullable(),
  language: z.string(),
  targetRoleId: z.string().nullable().optional().openapi({ example: 'role-software-engineer' }),
  targetRoleLabel: z.string().nullable().optional().openapi({ example: 'Software Engineer' }),
  isPublic: z.boolean(),
  slug: z.string().nullable(),
  contentPtBr: z.unknown().nullable(),
  contentEn: z.unknown().nullable(),
  primaryLanguage: z.string(),
  techPersona: z.string().nullable(),
  techArea: z.string().nullable(),
  primaryStack: z.array(z.string()),
  experienceYears: z.number().int().nullable(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  summary: z.string().nullable(),
  currentCompanyLogo: z.string().nullable(),
  twitter: z.string().nullable(),
  medium: z.string().nullable(),
  devto: z.string().nullable(),
  stackoverflow: z.string().nullable(),
  kaggle: z.string().nullable(),
  hackerrank: z.string().nullable(),
  leetcode: z.string().nullable(),
  accentColor: z.string().nullable(),
  customTheme: z.unknown().nullable(),
  styleId: z.string().uuid().nullable(),
  profileViews: z.number().int(),
  totalStars: z.number().int(),
  totalCommits: z.number().int(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  publishedAt: IsoDateTimeSchema.nullable(),
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
