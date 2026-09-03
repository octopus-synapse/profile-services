/**
 * Route descriptors for the resume-styles BC. Replaces
 * `ResumeStylesController` and `AdminResumeStylesController`, plus the
 * binary preview endpoint that previously lived in
 * `ResumeStylePreviewController` — the synthesizer now ships a
 * StreamableFile through unchanged thanks to its
 * `Res({ passthrough: true })` wiring.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { ResumeStylesUseCases } from './application/ports/resume-styles.port';
import {
  toDetailResponseDto,
  toListResponseDto,
} from './infrastructure/presenters/resume-style.presenter';
import {
  ApplyStyleBodySchema,
  ApplyStyleResponseSchema,
  IdParams,
  ListQuerySchema,
  ResumeIdParams,
  StyleDetailResponseSchema,
  StyleListResponseSchema,
} from './resume-styles.routes.schemas';

export const resumeStylesRoutes: ReadonlyArray<Route<ResumeStylesUseCases>> = [
  // ─── Public catalog ────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/resume-styles',
    auth: { kind: 'jwt' },
    query: ListQuerySchema,
    response: StyleListResponseSchema,
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
      return toListResponseDto(result);
    },
  },
  {
    method: 'GET',
    path: '/v1/resume-styles/:id',
    auth: { kind: 'jwt' },
    params: IdParams,
    response: StyleDetailResponseSchema,
    openapi: {
      summary: 'Get one ResumeStyle by id',
      tags: ['resume-styles'],
      description: 'ResumeStyle catalog + apply',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const style = await bc.getStyle.execute(id);
      return toDetailResponseDto(style);
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/style',
    auth: { kind: 'jwt' },
    params: ResumeIdParams,
    body: ApplyStyleBodySchema,
    response: ApplyStyleResponseSchema,
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
      return null;
    },
  },
  // ─── Admin CRUD (admin permission gates each route) ───────────────

  // ─── Binary stream: generic preview PDF ────────────────────────────
  {
    method: 'GET',
    path: '/v1/resume-styles/:id/preview.pdf',
    auth: { kind: 'jwt' },
    params: IdParams,
    binary: { mediaType: 'application/pdf', filename: 'style-preview.pdf' },
    openapi: {
      summary: 'Render a generic preview PDF for the style',
      tags: ['resume-styles'],
      description: 'ResumeStyle catalog + apply',
    },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const buffer = await bc.previewStyle.execute(id, ctx.user!.userId);
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `inline; filename="style-${id}-preview.pdf"`,
      });
    },
  },
];
