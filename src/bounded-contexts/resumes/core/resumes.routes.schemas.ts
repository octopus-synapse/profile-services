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
import {
  IdParamSchema,
  ResumeIdParamSchema,
  UserIdParamSchema,
} from '@/shared-kernel/schemas/params';
import {
  BioSchema,
  GitHubUrlSchema,
  LinkedInUrlSchema,
  PhoneSchema,
  SocialUrlSchema,
  UserLocationSchema,
} from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─────────────────────────────────────────────────────────────────────
// Common schemas
// ─────────────────────────────────────────────────────────────────────

export const PageLimitQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

export const _IdParam = IdParamSchema;
export const UserIdParam = UserIdParamSchema;
export const ResumeIdParam = ResumeIdParamSchema;
export const ResumeIdAndTypeKeyParam = ResumeIdParamSchema.extend({
  sectionTypeKey: z.string(),
});
export const ResumeIdAndTypeKeyAndItemIdParam = ResumeIdParamSchema.extend({
  sectionTypeKey: z.string(),
  itemId: z.string().uuid(),
});

export const LocaleQuery = z.object({ locale: z.string().optional() });

export const CreateResumeBody = z
  .object({
    title: z
      .string()
      .min(1)
      .max(100)
      .openapi({ description: 'Resume title shown in the user dashboard (max 100 chars).' }),
    summary: BioSchema.optional().openapi({
      description: 'Optional long-form summary shown at the top of the resume.',
    }),
    isPublic: z
      .boolean()
      .optional()
      .openapi({ description: 'Whether the resume is publicly viewable via its slug.' }),
    fullName: z
      .string()
      .max(100)
      .optional()
      .openapi({ description: 'Full name to render on the resume. Optional.' }),
    jobTitle: z
      .string()
      .max(100)
      .optional()
      .openapi({ description: 'Target job title or current role shown under the name.' }),
    phone: PhoneSchema,
    location: UserLocationSchema,
    linkedin: LinkedInUrlSchema.optional(),
    github: GitHubUrlSchema.optional(),
    website: SocialUrlSchema.optional(),
    sections: z.array(z.record(z.unknown())).optional().openapi({
      description: 'Generic resume sections. Each item references a SectionType by key.',
    }),
  })
  .openapi('CreateResumeRequest', {
    description:
      'Create-resume payload. `sections` are generic — each item references a SectionType by key with content validated server-side against the SectionType definition.',
    example: {
      title: 'Senior Software Engineer Resume',
      summary: 'Backend engineer with 8+ years of experience building distributed systems.',
      isPublic: false,
      fullName: 'Jane Doe',
      jobTitle: 'Senior Backend Engineer',
      location: 'San Francisco, CA',
      linkedin: 'https://www.linkedin.com/in/janedoe',
      github: 'https://github.com/janedoe',
    },
  });

export const DuplicateResumeBody = z
  .object({
    title: z
      .string()
      .min(1)
      .max(100)
      .openapi({ description: 'Title for the new resume (max 100 chars).' }),
    styleId: z.string().uuid().optional().openapi({
      description: 'ResumeStyle for the copy. Defaults to the source resume style.',
    }),
    language: z.string().optional().openapi({
      description: 'Language of the copy (e.g. pt-br, en). Defaults to the source language.',
    }),
    include: z
      .array(
        z.object({
          sectionTypeKey: z.string().openapi({ example: 'work_experience_v1' }),
          itemIds: z.array(z.string().uuid()).optional().openapi({
            description: 'Item ids of this section to copy. Omitted = every item.',
          }),
        }),
      )
      .optional()
      .openapi({
        description:
          'Sections (and optionally which items) to copy from the source. Omitted = copy everything.',
      }),
  })
  .openapi('DuplicateResumeRequest', {
    description:
      'Snapshot-copy of an existing resume. The copy diverges from the source — later edits to either do not affect the other. Publish state (slug/isPublic) and stats are reset.',
    example: {
      title: 'Backend Sênior — fintech',
      include: [
        { sectionTypeKey: 'work_experience_v1' },
        {
          sectionTypeKey: 'education_v1',
          itemIds: ['01900000-0000-7000-a000-000000000087'],
        },
      ],
    },
  });

export const UpdateResumeBody = CreateResumeBody.partial().openapi('UpdateResumeRequest', {
  description:
    'Partial update of a resume. Same shape as CreateResumeRequest with all fields optional.',
  example: {
    title: 'Updated Resume Title',
    summary: 'Updated professional summary.',
    isPublic: true,
  },
});

export const SectionItemBody = z
  .object({
    content: z.record(z.unknown()).optional(),
  })
  .openapi({
    example: {
      content: {
        title: 'Software Engineer',
        company: 'Acme Corp',
        startDate: '2022-01-01',
        endDate: '2024-06-01',
        description: 'Led the migration of the payments service to a new architecture.',
      },
    },
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

export const ResumeListItemSchema = ResumeBaseSchema.extend({
  fullName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  isPrimary: z.boolean().openapi({
    description: 'True when this resume is the master (User.primaryResumeId).',
    example: true,
  }),
  style: z
    .object({
      id: z.string().openapi({ example: '01900000-0000-7000-a000-000000000042' }),
      name: z.string().openapi({ example: 'Swiss Minimal' }),
      styleScore: z.number().int().min(0).max(100).openapi({
        description: "The template's Style Score (0-100, ATS-safety of the visual design).",
        example: 100,
      }),
    })
    .optional()
    .openapi({ description: 'Active visual style (template) of the resume.' }),
});

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
  styleScore: z.number().int().min(0).max(100).openapi({
    description: "The template's Style Score (0-100, ATS-safety of the visual design).",
    example: 100,
  }),
});

export const ResumeFullResponseSchema = ResumeBaseSchema.extend({
  resumeSections: z.array(ResumeSectionSchema),
  styleId: z.string().uuid().optional(),
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
  isMandatory: z.boolean().openapi({
    description:
      'Derived from definition.ats.isMandatory || minItems > 0. Mandatory sections are shown by the app even when empty.',
    example: true,
  }),
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
  resumeId: z.string().uuid(),
  sectionTypeId: z.string().uuid(),
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
