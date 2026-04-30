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
