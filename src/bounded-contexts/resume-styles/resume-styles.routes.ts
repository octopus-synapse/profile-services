/**
 * Route descriptors for the resume-styles BC. Replaces
 * `ResumeStylesController` (except the binary preview endpoint) and
 * `AdminResumeStylesController`. Pure data + handler closures over
 * `ResumeStylesUseCases`.
 *
 * Edge case: `GET /v1/resume-styles/:id/preview.pdf` streams a PDF via
 * `@Res() res` and stays as a legacy controller — see
 * `infrastructure/controllers/resume-style-preview.controller.ts`.
 */

import { LayoutKind } from '@prisma/client';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ResumeStylesUseCases } from './application/ports/resume-styles.port';
import { presentDetail, presentList } from './infrastructure/presenters/resume-style.presenter';

const IdParams = z.object({ id: z.string() });
const ResumeIdParams = z.object({ resumeId: z.string() });

const ListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

const ApplyStyleBodySchema = z.object({ styleId: z.string() });

const SectionStylesSchema = z.record(z.string(), z.unknown());

const LayoutKindSchema = z.nativeEnum(LayoutKind);

const CreateStyleBodySchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  typstTemplate: z.string(),
  layoutKind: LayoutKindSchema,
  styleConfig: z.record(z.string(), z.unknown()),
  sectionStyles: SectionStylesSchema,
});

const UpdateStyleBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  typstTemplate: z.string().optional(),
  layoutKind: LayoutKindSchema.optional(),
  styleConfig: z.record(z.string(), z.unknown()).optional(),
  sectionStyles: SectionStylesSchema.optional(),
});

export const resumeStylesRoutes: ReadonlyArray<Route<ResumeStylesUseCases>> = [
  // ─── Public catalog ────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/resume-styles',
    auth: { kind: 'jwt' },
    query: ListQuerySchema,
    openapi: {
      summary: 'List published resume styles',
      tags: ['resume-styles'],
      description: 'ResumeStyle catalog + apply',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = ctx.query as { page?: string; limit?: string };
      const result = await bc.listStyles.execute({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return { success: true, data: presentList(result) };
    },
  },
  {
    method: 'GET',
    path: '/v1/resume-styles/:id',
    auth: { kind: 'jwt' },
    params: IdParams,
    openapi: {
      summary: 'Get one ResumeStyle by id',
      tags: ['resume-styles'],
      description: 'ResumeStyle catalog + apply',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const style = await bc.getStyle.execute(id);
      return { success: true, data: presentDetail(style) };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/style',
    auth: { kind: 'jwt' },
    params: ResumeIdParams,
    body: ApplyStyleBodySchema,
    openapi: {
      summary: 'Apply a ResumeStyle to a resume',
      tags: ['resume-styles'],
      description: 'ResumeStyle catalog + apply',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as { styleId: string };
      await bc.applyStyleToResume.execute({
        userId: ctx.user!.userId,
        resumeId,
        styleId: body.styleId,
      });
      return { success: true, data: null };
    },
  },
  // ─── Admin CRUD (admin permission gates each route) ───────────────
  {
    method: 'POST',
    path: '/v1/admin/resume-styles',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    body: CreateStyleBodySchema,
    openapi: {
      summary: 'Create a new ResumeStyle (validates ATS threshold)',
      tags: ['admin-resume-styles'],
      description: 'Admin ResumeStyle CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof CreateStyleBodySchema>;
      const created = await bc.createStyle.execute({
        name: body.name,
        description: body.description ?? null,
        typstTemplate: body.typstTemplate,
        layoutKind: body.layoutKind,
        styleConfig: body.styleConfig,
        sectionStyles: body.sectionStyles,
        authorId: ctx.user!.userId,
      });
      return { success: true, data: presentDetail(created) };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/admin/resume-styles/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParams,
    body: UpdateStyleBodySchema,
    openapi: {
      summary: 'Update a non-system ResumeStyle',
      tags: ['admin-resume-styles'],
      description: 'Admin ResumeStyle CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof UpdateStyleBodySchema>;
      const updated = await bc.updateStyle.execute(id, {
        name: body.name,
        description: body.description,
        typstTemplate: body.typstTemplate,
        layoutKind: body.layoutKind,
        styleConfig: body.styleConfig,
        sectionStyles: body.sectionStyles,
      });
      return { success: true, data: presentDetail(updated) };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/admin/resume-styles/:id',
    auth: { kind: 'jwt' },
    permission: Permission.ADMIN_FULL_ACCESS,
    params: IdParams,
    openapi: {
      summary: 'Delete a non-system ResumeStyle',
      tags: ['admin-resume-styles'],
      description: 'Admin ResumeStyle CRUD',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteStyle.execute(id);
      return { success: true, data: null };
    },
  },
];
