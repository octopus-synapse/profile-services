/**
 * Route descriptors for the export BC. Replaces the four legacy Nest
 * controllers (banner / pdf / docx / multi-format). Each handler stays
 * a wire: it sanitizes inputs, delegates to `ExportPipelineService`
 * (which owns the Requested/Completed/Failed event lifecycle and the
 * 500 translation), and returns a `StreamableFile` from the buffer —
 * the synthesizer's `Res({ passthrough: true })` lets the
 * `StreamableFile` flow through Nest's response interceptor unchanged.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { ExportHttpBundle } from './application/ports/export-http.bundle';
import { sanitizeQueryParam } from './infrastructure/helpers';
import { presentPdfAsBase64 } from './infrastructure/presenters/pdf-base64.presenter';

// ─── Schemas ─────────────────────────────────────────────────────────
const BannerQuery = z.object({
  palette: z.string().optional(),
  logo: z.string().optional(),
});
const ResumePdfQuery = z.object({
  palette: z.string().optional(),
  lang: z.string().optional(),
  bannerColor: z.string().optional(),
  template: z.string().optional(),
});
const ResumeIdParams = z.object({ resumeId: z.string() });
const UserIdParams = z.object({ userId: z.string() });
const JsonExportQuery = z.object({ format: z.string().optional() });
const LatexExportQuery = z.object({ template: z.string().optional() });

const PDF_HEADERS = {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'attachment; filename="resume.pdf"',
} as const;

const DOCX_HEADERS = {
  'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'Content-Disposition': 'attachment; filename="resume.docx"',
} as const;

const BANNER_HEADERS = {
  'Content-Type': 'image/png',
  'Content-Disposition': 'attachment; filename="linkedin-banner.png"',
} as const;

// Base64 PDF JSON envelope used by the admin "fetch another user's
// resume" endpoint where streaming the PDF directly is not viable.
const PdfBase64ResponseSchema = z.object({
  pdf: z.string(),
  filename: z.string(),
});

export const exportRoutes: ReadonlyArray<Route<ExportHttpBundle>> = [
  // ─── Banner ────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/export/banner',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    query: BannerQuery,
    headers: BANNER_HEADERS,
    binary: { mediaType: 'image/png', filename: 'linkedin-banner.png' },
    openapi: {
      summary: 'Export LinkedIn banner image',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof BannerQuery>;
      const buffer = await bundle.pipeline.runBanner(() =>
        bundle.bannerCapture.capture(q.palette, q.logo),
      );
      return new StreamableFile(buffer);
    },
  },

  // ─── PDF ───────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/export/resume/pdf',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    query: ResumePdfQuery,
    headers: PDF_HEADERS,
    binary: { mediaType: 'application/pdf', filename: 'resume.pdf' },
    guards: [{ id: 'feature-flag', metadata: { key: 'resumes.export.pdf' } }],
    openapi: {
      summary: 'Export resume as PDF document',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof ResumePdfQuery>;
      const safePalette = sanitizeQueryParam(q.palette);
      const safeLang = sanitizeQueryParam(q.lang);
      const safeBannerColor = sanitizeQueryParam(q.bannerColor);
      const safeTemplate = q.template === 'ats' ? ('ats' as const) : ('default' as const);
      const userId = ctx.user!.userId;
      const buffer = await bundle.pipeline.run('pdf', userId, () =>
        bundle.pdfCache.serve(
          {
            userId,
            renderArgs: {
              palette: safePalette,
              lang: safeLang,
              bannerColor: safeBannerColor,
              template: safeTemplate,
            },
          },
          () =>
            bundle.useCases.exportPdfUseCase.execute({
              palette: safePalette,
              lang: safeLang,
              bannerColor: safeBannerColor,
              userId,
              template: safeTemplate,
            }),
        ),
      );
      return new StreamableFile(buffer);
    },
  },
  {
    method: 'GET',
    path: '/v1/export/user/:userId/resume/pdf',
    auth: { kind: 'jwt' },
    params: UserIdParams,
    response: PdfBase64ResponseSchema,
    openapi: {
      summary: "Generate another user's resume as PDF (base64)",
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      const buffer = await bundle.pipeline.run('pdf', targetUserId, () =>
        bundle.pdfCache.serve({ userId: targetUserId, renderArgs: {} }, () =>
          bundle.useCases.exportPdfUseCase.execute({ userId: targetUserId }),
        ),
      );
      return presentPdfAsBase64(buffer);
    },
  },

  // ─── DOCX ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/export/resume/docx',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    headers: DOCX_HEADERS,
    binary: {
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'resume.docx',
    },
    openapi: {
      summary: 'Export resume as DOCX document',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const buffer = await bundle.pipeline.run('docx', userId, () =>
        bundle.useCases.exportDocxUseCase.execute({ userId }),
      );
      return new StreamableFile(buffer);
    },
  },

  // ─── Multi-format (JSON / LaTeX) ───────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/export/:resumeId/json',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    params: ResumeIdParams,
    query: JsonExportQuery,
    binary: { mediaType: 'application/json', filename: 'resume.json' },
    openapi: {
      summary: 'Export resume as JSON',
      tags: ['Export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const q = ctx.query as z.infer<typeof JsonExportQuery>;
      const format = q.format === 'profile' ? 'profile' : 'jsonresume';
      const buffer = await bundle.useCases.exportJsonUseCase.executeAsBuffer({
        resumeId,
        format,
      });
      const headers = {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="resume-${resumeId}.json"`,
      };
      // Wrap as StreamableFile so the response interceptor passes it
      // through unchanged.
      return new StreamableFile(buffer, {
        type: headers['Content-Type'],
        disposition: headers['Content-Disposition'],
      });
    },
  },
  {
    method: 'GET',
    path: '/api/v1/export/:resumeId/latex',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    params: ResumeIdParams,
    query: LatexExportQuery,
    binary: { mediaType: 'application/x-tex', filename: 'resume.tex' },
    openapi: {
      summary: 'Export resume as LaTeX',
      tags: ['Export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const q = ctx.query as z.infer<typeof LatexExportQuery>;
      const template = q.template === 'moderncv' ? 'moderncv' : 'simple';
      const buffer = await bundle.useCases.exportLatexUseCase.executeAsBuffer({
        resumeId,
        template,
      });
      return new StreamableFile(buffer, {
        type: 'application/x-latex',
        disposition: `attachment; filename="resume-${resumeId}.tex"`,
      });
    },
  },
];
