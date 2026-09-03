/**
 * Route descriptors for the export BC. Replaces the four legacy Nest
 * controllers (banner / pdf / docx / multi-format). Each handler stays
 * a wire: it sanitizes inputs, delegates to `ExportPipelineService`
 * (which owns the Requested/Completed/Failed event lifecycle and the
 * 500 translation), and returns a `StreamableFile` from the buffer —
 * the synthesizer's `Res({ passthrough: true })` lets the
 * `StreamableFile` flow through Nest's response interceptor unchanged.
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { FLAG_KEYS } from '@/bounded-contexts/platform/feature-flags/registry/flag-keys';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { ExportHttpBundle } from './application/ports/export-http.bundle';
import {
  BANNER_HEADERS,
  BannerQuery,
  PdfBase64ResponseSchema,
  PresignedDownloadResponseSchema,
  ResumePdfQuery,
  ResumePreviewResponseSchema,
  UserIdParams,
} from './export.routes.schemas';
import { sanitizeQueryParam } from './infrastructure/helpers';
import { toPdfBase64ResponseDto } from './infrastructure/presenters/pdf-base64.presenter';

const DOWNLOAD_TTL_SECONDS = 300;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
  // Returns a pre-signed MinIO URL the browser uses for native download.
  // Backend uploads the rendered binary with a private ACL + short TTL,
  // so the frontend never touches Blob/atob/MIME.
  {
    method: 'GET',
    path: '/v1/export/resume/pdf',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    query: ResumePdfQuery,
    response: PresignedDownloadResponseSchema,
    guards: [{ id: 'feature-flag', metadata: { key: FLAG_KEYS.RESUMES_EXPORT_PDF } }],
    openapi: {
      summary: 'Generate resume PDF (returns signed download URL)',
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
            resumeId: q.resumeId,
            renderArgs: {
              palette: safePalette,
              lang: safeLang,
              bannerColor: safeBannerColor,
              template: safeTemplate,
              // Part of the cache key: a tailored overlay renders different
              // bytes than the plain resume.
              versionId: q.versionId,
            },
          },
          () =>
            bundle.useCases.exportPdfUseCase.execute({
              palette: safePalette,
              lang: safeLang,
              bannerColor: safeBannerColor,
              userId,
              resumeId: q.resumeId,
              versionId: q.versionId,
              template: safeTemplate,
            }),
        ),
      );
      const filename = `resume-${userId}-${Date.now()}.pdf`;
      const signed = await bundle.s3.uploadAndPresign({
        key: `exports/${userId}/${randomUUID()}.pdf`,
        body: buffer,
        contentType: 'application/pdf',
        filename,
        ttlSeconds: DOWNLOAD_TTL_SECONDS,
      });
      return { ...signed, filename };
    },
  },
  // ─── HTML preview (realtime, high-fidelity PDF mirror) ─────────────
  // Renders the resume's AST to a self-contained HTML document inline —
  // no Typst child process, no MinIO upload, no presigned URL. The app
  // embeds the returned `html` in an iframe (web) / WebView (native).
  {
    method: 'GET',
    path: '/v1/export/resume/preview',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    query: ResumePdfQuery,
    response: ResumePreviewResponseSchema,
    openapi: {
      summary: 'Render the resume as an HTML preview (high-fidelity PDF mirror)',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof ResumePdfQuery>;
      const userId = ctx.user!.userId;
      const html = await bundle.resumeHtmlGenerator.generate({
        userId,
        resumeId: q.resumeId,
        versionId: q.versionId,
        lang: sanitizeQueryParam(q.lang),
        template: q.template === 'ats' ? 'ats' : 'default',
      });
      return { html };
    },
  },
  {
    method: 'GET',
    path: '/v1/export/user/:userId/resume/pdf',
    auth: { kind: 'jwt' },
    // P0-004: ownership guard — only the user themself can export their resume
    // through this endpoint. Cross-user exports were possible before the guard.
    guards: [{ id: 'ownership', metadata: { entity: 'user', paramKey: 'userId' } }],
    params: UserIdParams,
    response: PdfBase64ResponseSchema,
    openapi: {
      summary: "Generate the authenticated user's resume as PDF (base64)",
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
      return toPdfBase64ResponseDto(buffer);
    },
  },

  // ─── DOCX ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/export/resume/docx',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    response: PresignedDownloadResponseSchema,
    openapi: {
      summary: 'Generate resume DOCX (returns signed download URL)',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const buffer = await bundle.pipeline.run('docx', userId, () =>
        bundle.useCases.exportDocxUseCase.execute({ userId }),
      );
      const filename = `resume-${userId}-${Date.now()}.docx`;
      const signed = await bundle.s3.uploadAndPresign({
        key: `exports/${userId}/${randomUUID()}.docx`,
        body: buffer,
        contentType: DOCX_MIME,
        filename,
        ttlSeconds: DOWNLOAD_TTL_SECONDS,
      });
      return { ...signed, filename };
    },
  },
];
