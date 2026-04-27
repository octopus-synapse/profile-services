/**
 * Route descriptors for the resumes/core BC. Replaces the JSON
 * endpoints in `ResumesController`, the entire
 * `ResumeManagementController`, and the entire
 * `GenericResumeSectionsController`. The SVG thumbnail endpoint stays
 * in the legacy `ResumesController` because the synthesizer does not
 * model `@Header()` / non-JSON responses yet.
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

const IdParam = z.object({ id: z.string() });
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
  emailContact: z.string().email().optional(),
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
      const data = toPaginatedResumesData(result, { page, limit });
      return { success: true, data };
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
      return { success: true, data: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:id/full',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: IdParam,
    openapi: {
      summary: 'Get a resume with all sections',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const result = await bc.findResumeByIdForUserUseCase.execute(id, ctx.user!.userId);
      return { success: true, data: toResumeFullResponseDto(result) };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: IdParam,
    openapi: {
      summary: 'Get a specific resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const result = await bc.findResumeByIdForUserUseCase.execute(id, ctx.user!.userId);
      return { success: true, data: toResumeFullResponseDto(result) };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes',
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
      return { success: true, data: toResumeResponseDto(result) };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/resumes/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: IdParam,
    body: UpdateResumeBody,
    openapi: {
      summary: 'Update a resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as unknown as UpdateResume;
      const result = await bc.updateResumeForUserUseCase.execute(id, ctx.user!.userId, body);
      return { success: true, data: toResumeResponseDto(result) };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_DELETE,
    params: IdParam,
    openapi: {
      summary: 'Delete a resume',
      tags: ['resumes'],
      description: 'Resume CRUD operations',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteResumeForUserUseCase.execute(id, ctx.user!.userId);
      return { success: true, data: { deleted: true, id } };
    },
  },
];

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
      return { success: true, data: { resumes: resumes.resumes } };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/manage/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: IdParam,
    openapi: {
      summary: 'Get full resume details',
      tags: ['resumes'],
      description: 'Resumes API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const resume = await bc.getResumeDetailsUseCase.execute(id);
      return { success: true, data: { resume } };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/manage/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_DELETE,
    params: IdParam,
    openapi: {
      summary: 'Delete a resume',
      tags: ['resumes'],
      description: 'Resumes API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteResumeUseCase.execute(id);
      return { success: true, data: { message: 'Resume deleted successfully' } };
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
      return {
        success: true,
        data: toResumeSectionTypesData(
          rawSectionTypes as Parameters<typeof toResumeSectionTypesData>[0],
          locale,
        ),
      };
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
      return { success: true, data: { sections } };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/sections/:sectionTypeKey/items',
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
      return { success: true, data: { item } };
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
      return { success: true, data: { item } };
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
      return { success: true, data: { deleted: true }, message: 'Section item deleted' };
    },
  },
];
