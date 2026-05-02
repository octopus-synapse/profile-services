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
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver';
import { ResumesUseCases } from './application/ports/resumes-use-cases.port';
import { toResumeSectionTypesData } from './presenters/generic-resume-sections.presenter';
import {
  toPaginatedResumesData,
  toResumeFullResponseDto,
  toResumeResponseDto,
} from './presenters/resumes.presenter';
import { GenericResumeSectionsUseCases } from './services/generic-resume-sections/ports/generic-resume-sections-repository.port';
import { ResumeManagementUseCases } from './services/resume-management/ports/resume-management.port';

// ─────────────────────────────────────────────────────────────────────
// Common schemas
// ─────────────────────────────────────────────────────────────────────

const PageLimitQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

const _IdParam = z.object({ id: z.string() });
const UserIdParam = z.object({ userId: z.string() });
const ResumeIdParam = z.object({ resumeId: z.string() });
const ResumeIdAndTypeKeyParam = z.object({
  resumeId: z.string(),
  sectionTypeKey: z.string(),
});
const ResumeIdAndTypeKeyAndItemIdParam = z.object({
  resumeId: z.string(),
  sectionTypeKey: z.string(),
  itemId: z.string(),
});

const LocaleQuery = z.object({ locale: z.string().optional() });

const CreateResumeBody = z.object({
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

const UpdateResumeBody = CreateResumeBody.partial();

const SectionItemBody = z.object({
  content: z.record(z.unknown()).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value: leaf | array of leaves | object of leaves.
// Two levels deep covers the section item content shapes.
const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const JsonNodeLevel2Schema = z.union([
  JsonLeafSchema,
  z.array(JsonLeafSchema),
  z.record(z.string(), JsonLeafSchema),
]);
const JsonNodeLevel1Schema = z.union([
  JsonLeafSchema,
  z.array(JsonNodeLevel2Schema),
  z.record(z.string(), JsonNodeLevel2Schema),
]);
const JsonObjectSchema = z.record(z.string(), JsonNodeLevel1Schema);

const ResumeBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().optional(),
  targetRole: z.string().optional(),
  isPublic: z.boolean(),
  slug: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ResumeListItemSchema = ResumeBaseSchema;

const PaginatedResumesResponseSchema = z.object({
  items: z.array(ResumeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

const ResumeSectionItemSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  content: JsonObjectSchema.optional(),
});

const ResumeSectionTypeRefSchema = z.object({
  id: z.string(),
  key: z.string(),
  semanticKind: z.string().optional(),
  title: z.string().optional(),
  version: z.number().int().optional(),
});

const ResumeSectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  visible: z.boolean(),
  sectionType: ResumeSectionTypeRefSchema,
  items: z.array(ResumeSectionItemSchema),
});

const ResumeStyleRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const ResumeFullResponseSchema = ResumeBaseSchema.extend({
  resumeSections: z.array(ResumeSectionSchema),
  styleId: z.string().optional(),
  style: ResumeStyleRefSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

const DeleteResumeResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

// Resume management responses (use Prisma-shaped data).
// Date fields are serialized to ISO strings by the response serializer.
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
  definition: JsonObjectSchema.nullable(),
  uiSchema: JsonObjectSchema.nullable(),
  renderHints: JsonObjectSchema.nullable(),
  fieldStyles: JsonObjectSchema.nullable(),
  iconType: z.string(),
  icon: z.string(),
  translations: JsonObjectSchema.nullable(),
  examples: JsonObjectSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const MgmtSectionItemSchema = z.object({
  id: z.string(),
  resumeSectionId: z.string(),
  content: JsonObjectSchema.nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const MgmtResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sectionType: MgmtSectionTypeSchema,
  items: z.array(MgmtSectionItemSchema),
});

const MgmtResumeListItemSchema = z.object({
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resumeSections: z.array(MgmtResumeSectionSchema),
  _count: z.object({ resumeSections: z.number().int() }),
});

const MgmtResumeListResponseSchema = z.object({
  resumes: z.array(MgmtResumeListItemSchema),
});

const MgmtResumeDetailsSchema = z.object({
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  resumeSections: z.array(MgmtResumeSectionSchema),
});

const MgmtResumeDetailsResponseSchema = z.object({
  resume: MgmtResumeDetailsSchema,
});

const MgmtResumeMessageResponseSchema = z.object({
  message: z.string(),
});

// Generic resume sections responses
const ResolvedSectionTypeSchema = z.object({
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

const ResumeSectionTypesDataSchema = z.object({
  sectionTypes: z.array(ResolvedSectionTypeSchema),
});

// Generic sections list (used by /v1/resumes/:resumeId/sections)
const GenericResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sectionType: MgmtSectionTypeSchema.nullable(),
  items: z.array(MgmtSectionItemSchema),
});

const ResumeSectionsListResponseSchema = z.object({
  sections: z.array(GenericResumeSectionSchema),
});

const ResumeSectionItemDataResponseSchema = z.object({
  item: MgmtSectionItemSchema,
});

const ResumeSectionItemDeletedResponseSchema = z.object({
  deleted: z.boolean(),
});

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─────────────────────────────────────────────────────────────────────
// Resumes (CRUD)
// ─────────────────────────────────────────────────────────────────────

export const resumesRoutes: ReadonlyArray<Route<ResumesUseCases>> = [
  {
    method: 'GET',
    path: '/v1/resumes',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    query: PageLimitQuery,
    response: PaginatedResumesResponseSchema,
    openapi: {
      summary: 'Get all resumes for current user',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof PageLimitQuery>;
      const page = parsePositiveInt(q.page, 1);
      const limit = parsePositiveInt(q.limit, 50);
      const result = await bc.findAllUserResumesUseCase.execute(ctx.user!.userId, page, limit);
      return toPaginatedResumesData(result, { page, limit });
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/slots',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    response: ResumeSlotsResponseSchema,
    openapi: {
      summary: 'Get remaining resume slots for current user',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = await bc.getRemainingSlotsUseCase.execute(ctx.user!.userId);
      return result;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/full',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParam,
    response: ResumeFullResponseSchema,
    openapi: {
      summary: 'Get a resume with all sections',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      const result = await bc.findResumeByIdForUserUseCase.execute(id, ctx.user!.userId);
      return toResumeFullResponseDto(result);
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParam,
    response: ResumeFullResponseSchema,
    openapi: {
      summary: 'Get a specific resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      const result = await bc.findResumeByIdForUserUseCase.execute(id, ctx.user!.userId);
      return toResumeFullResponseDto(result);
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_CREATE,
    body: CreateResumeBody,
    response: ResumeBaseSchema,
    openapi: {
      summary: 'Create a new resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as unknown as CreateResume;
      const result = await bc.createResumeForUserUseCase.execute(ctx.user!.userId, body);
      return toResumeResponseDto(result);
    },
  },
  {
    method: 'PATCH',
    path: '/v1/resumes/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: ResumeIdParam,
    body: UpdateResumeBody,
    response: ResumeBaseSchema,
    openapi: {
      summary: 'Update a resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      const body = ctx.body as unknown as UpdateResume;
      const result = await bc.updateResumeForUserUseCase.execute(id, ctx.user!.userId, body);
      return toResumeResponseDto(result);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_DELETE,
    params: ResumeIdParam,
    response: DeleteResumeResponseSchema,
    openapi: {
      summary: 'Delete a resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      await bc.deleteResumeForUserUseCase.execute(id, ctx.user!.userId);
      return { deleted: true, id };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/thumbnail.svg',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParam,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
    openapi: {
      summary: 'Lightweight SVG thumbnail of the resume (name + title + summary preview)',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      const result = await bc.findResumeByIdForUserUseCase.execute(id, ctx.user!.userId);
      const resume = (result as { resume?: Record<string, unknown> }).resume ?? result;
      const fullName =
        (resume as { fullName?: string | null; title?: string | null }).fullName ??
        (resume as { title?: string | null }).title ??
        'Currículo';
      const jobTitle = (resume as { jobTitle?: string | null }).jobTitle ?? '';
      const summary = (resume as { summary?: string | null }).summary ?? '';
      return renderResumeThumbnailSvg(String(fullName), String(jobTitle), String(summary));
    },
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function renderResumeThumbnailSvg(fullName: string, jobTitle: string, summary: string): string {
  const name = escapeXml(truncate(fullName, 40));
  const title = escapeXml(truncate(jobTitle, 50));
  const s = escapeXml(truncate(summary, 160));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
  <rect width="320" height="420" rx="12" fill="#ffffff" stroke="#e5e7eb"/>
  <rect x="0" y="0" width="320" height="90" fill="#0f172a"/>
  <circle cx="50" cy="45" r="22" fill="#06b6d4" opacity="0.25"/>
  <text x="80" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">${name}</text>
  <text x="80" y="62" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#cbd5e1">${title}</text>
  <rect x="20" y="110" width="280" height="8" rx="2" fill="#e5e7eb"/>
  <rect x="20" y="128" width="240" height="8" rx="2" fill="#e5e7eb"/>
  <rect x="20" y="146" width="260" height="8" rx="2" fill="#e5e7eb"/>
  <foreignObject x="20" y="170" width="280" height="140">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; color: #475569; line-height: 1.5;">${s}</div>
  </foreignObject>
  <rect x="20" y="330" width="80" height="10" rx="5" fill="#ecfeff"/>
  <rect x="108" y="330" width="70" height="10" rx="5" fill="#ecfeff"/>
  <rect x="186" y="330" width="90" height="10" rx="5" fill="#ecfeff"/>
  <rect x="20" y="350" width="60" height="10" rx="5" fill="#ecfeff"/>
  <text x="160" y="400" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="#67e8f9" text-anchor="middle" letter-spacing="1">patch.careers</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────
// Resume management (elevated permissions)
// ─────────────────────────────────────────────────────────────────────

export const resumeManagementRoutes: ReadonlyArray<Route<ResumeManagementUseCases>> = [
  {
    method: 'GET',
    path: '/v1/resumes/manage/user/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: UserIdParam,
    response: MgmtResumeListResponseSchema,
    openapi: {
      summary: 'List all resumes for a specific user',
      tags: ['resumes'],
      description: 'Resumes API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const resumes = await bc.listResumesForUserUseCase.execute(userId);
      return { resumes: resumes.resumes };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/manage/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: ResumeIdParam,
    response: MgmtResumeDetailsResponseSchema,
    openapi: {
      summary: 'Get full resume details',
      tags: ['resumes'],
      description: 'Resumes API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      const resume = await bc.getResumeDetailsUseCase.execute(id);
      return { resume };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/manage/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_DELETE,
    params: ResumeIdParam,
    response: MgmtResumeMessageResponseSchema,
    openapi: {
      summary: 'Delete a resume',
      tags: ['resumes'],
      description: 'Resumes API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId: id } = ctx.params as { resumeId: string };
      await bc.deleteResumeUseCase.execute(id);
      return { message: 'Resume deleted successfully' };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────
// Generic resume sections
// ─────────────────────────────────────────────────────────────────────

export const genericResumeSectionsRoutes: ReadonlyArray<Route<GenericResumeSectionsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/sections/types',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_READ,
    params: ResumeIdParam,
    query: LocaleQuery,
    response: ResumeSectionTypesDataSchema,
    openapi: {
      summary: 'List active dynamic section types with resolved translations',
      tags: ['resumes'],
      description: 'Generic Resume Sections API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { locale: localeParam } = ctx.query as z.infer<typeof LocaleQuery>;
      const locale = parseLocale(localeParam);
      const rawSectionTypes = await bc.listSectionTypesUseCase.execute();
      return toResumeSectionTypesData(
        rawSectionTypes as Parameters<typeof toResumeSectionTypesData>[0],
        locale,
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/sections',
    auth: { kind: 'jwt' },
    params: ResumeIdParam,
    response: ResumeSectionsListResponseSchema,
    openapi: {
      summary: 'List sections and items for a resume',
      tags: ['resumes'],
      description: 'Generic Resume Sections API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const sections = await bc.listResumeSectionsUseCase.execute(resumeId, ctx.user!.userId);
      return { sections };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/sections/:sectionTypeKey/items',
    statusCode: 201,
    auth: { kind: 'jwt' },
    params: ResumeIdAndTypeKeyParam,
    body: SectionItemBody,
    response: ResumeSectionItemDataResponseSchema,
    openapi: {
      summary: 'Create section item in a dynamic section type',
      tags: ['resumes'],
      description: 'Generic Resume Sections API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId, sectionTypeKey } = ctx.params as {
        resumeId: string;
        sectionTypeKey: string;
      };
      const body = ctx.body as z.infer<typeof SectionItemBody>;
      const item = await bc.createSectionItemUseCase.execute(
        resumeId,
        sectionTypeKey,
        ctx.user!.userId,
        body.content ?? {},
      );
      return { item };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/resumes/:resumeId/sections/:sectionTypeKey/items/:itemId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndTypeKeyAndItemIdParam,
    body: SectionItemBody,
    response: ResumeSectionItemDataResponseSchema,
    openapi: {
      summary: 'Update section item in a dynamic section type',
      tags: ['resumes'],
      description: 'Generic Resume Sections API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId, sectionTypeKey, itemId } = ctx.params as {
        resumeId: string;
        sectionTypeKey: string;
        itemId: string;
      };
      const body = ctx.body as z.infer<typeof SectionItemBody>;
      const item = await bc.updateSectionItemUseCase.execute(
        resumeId,
        sectionTypeKey,
        itemId,
        ctx.user!.userId,
        body.content ?? {},
      );
      return { item };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/:resumeId/sections/:sectionTypeKey/items/:itemId',
    auth: { kind: 'jwt' },
    params: ResumeIdAndTypeKeyAndItemIdParam,
    response: ResumeSectionItemDeletedResponseSchema,
    openapi: {
      summary: 'Delete section item from a dynamic section type',
      tags: ['resumes'],
      description: 'Generic Resume Sections API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId, sectionTypeKey, itemId } = ctx.params as {
        resumeId: string;
        sectionTypeKey: string;
        itemId: string;
      };
      await bc.deleteSectionItemUseCase.execute(resumeId, sectionTypeKey, itemId, ctx.user!.userId);
      return { deleted: true };
    },
  },
];
