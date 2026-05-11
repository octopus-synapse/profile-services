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
  JsonExportQuery,
  LatexExportQuery,
  PdfBase64ResponseSchema,
  PresignedDownloadResponseSchema,
  ResumeBundleRequestSchema,
  ResumeIdParams,
  ResumePdfQuery,
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

  // ─── Bundle (multi-format zip — F3-PD-009c / PD-018 fix) ───────────
  {
    method: 'POST',
    path: '/v1/export/:resumeId/bundle',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    // PD-018: ownership guard resolves resumeId → ownerId and rejects
    // non-owners with 403. Without this, any authenticated user could
    // export any resume by guessing the UUID.
    guards: [{ id: 'ownership', metadata: { entity: 'resume', paramKey: 'resumeId' } }],
    params: ResumeIdParams,
    body: ResumeBundleRequestSchema,
    response: PresignedDownloadResponseSchema,
    openapi: {
      summary: 'Generate a multi-format zip bundle of the resume',
      tags: ['export'],
      description: 'Export API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as z.infer<typeof ResumeBundleRequestSchema>;
      const userId = ctx.user!.userId;
      const buffer = await bundle.useCases.exportBundleUseCase.execute({
        userId,
        resumeId,
        formats: body.formats,
        language: body.language,
      });
      const filename = `resume-${userId}-${Date.now()}.zip`;
      const signed = await bundle.s3.uploadAndPresign({
        key: `exports/${userId}/${randomUUID()}.zip`,
        body: buffer,
        contentType: 'application/zip',
        filename,
        ttlSeconds: DOWNLOAD_TTL_SECONDS,
      });
      return { ...signed, filename };
    },
  },

  // ─── Multi-format (JSON / LaTeX) ───────────────────────────────────
  {
    method: 'GET',
    path: '/v1/export/:resumeId/json',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    // P0-004: ownership guard — only the resume owner can export it.
    guards: [{ id: 'ownership', metadata: { entity: 'resume', paramKey: 'resumeId' } }],
    params: ResumeIdParams,
    query: JsonExportQuery,
    response: PresignedDownloadResponseSchema,
    openapi: {
      summary: 'Generate resume JSON (returns signed download URL)',
      tags: ['export'],
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
      const filename = `resume-${resumeId}.json`;
      const signed = await bundle.s3.uploadAndPresign({
        key: `exports/${resumeId}/${randomUUID()}.json`,
        body: buffer,
        contentType: 'application/json',
        filename,
        ttlSeconds: DOWNLOAD_TTL_SECONDS,
      });
      return { ...signed, filename };
    },
  },
  {
    method: 'GET',
    path: '/v1/export/:resumeId/latex',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_EXPORT,
    // P0-004: ownership guard — only the resume owner can export it.
    guards: [{ id: 'ownership', metadata: { entity: 'resume', paramKey: 'resumeId' } }],
    params: ResumeIdParams,
    query: LatexExportQuery,
    response: PresignedDownloadResponseSchema,
    openapi: {
      summary: 'Generate resume LaTeX (returns signed download URL)',
      tags: ['export'],
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
      const filename = `resume-${resumeId}.tex`;
      const signed = await bundle.s3.uploadAndPresign({
        key: `exports/${resumeId}/${randomUUID()}.tex`,
        body: buffer,
        contentType: 'application/x-tex',
        filename,
        ttlSeconds: DOWNLOAD_TTL_SECONDS,
      });
      return { ...signed, filename };
    },
  },
];
