/**
 * Route descriptors for the import BC. Replaces the JSON portions of
 * `ResumeImportController` plus `GithubImportController`. Pure data +
 * handler closures over `ImportUseCases`.
 *
 * The PDF upload + GitHub session-import endpoints (which previously
 * lived in the legacy `ResumeImportFilesController`) are now expressed
 * as routes too: PDF as `kind: 'multipart'`, GitHub as a plain JSON
 * route. Both run against the same `ImportUseCases` bundle, which now
 * exposes the stateful `pdfImport` / `githubImport` POJO adapters
 * alongside the pure use-cases.
 */

import type { MultipartBody } from '@/infrastructure/elysia-adapter/multipart-bridge';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { ImportUseCases } from './application/ports/import.port';
import {
  LinkedinImportNotImplementedException,
  MissingPdfUploadException,
} from './domain/exceptions/import.exceptions';
import type { JsonResumeSchema } from './domain/types/import.types';
import {
  GithubImportBodySchema,
  GithubImportResponseSchema,
  GithubParsedProfileResponseSchema,
  ImportEmptyResponseSchema,
  ImportIdParams,
  ImportJobListResponseSchema,
  ImportJobResponseSchema,
  ImportResultResponseSchema,
  JsonImportBodySchema,
  ParsedResumeDataResponseSchema,
  PdfImportResponseSchema,
  parser,
  validateJsonResume,
} from './import.routes.schemas';
import {
  toImportJobDto,
  toImportJobDtoList,
  toImportResultDto,
  toParsedResumeDataDto,
} from './infrastructure/mappers/import.mapper';

export const importRoutes: ReadonlyArray<Route<ImportUseCases>> = [
  {
    method: 'POST',
    path: '/v1/resumes/imports/linkedin',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    response: ImportResultResponseSchema,
    openapi: {
      summary: 'Import profile data from LinkedIn (scaffold)',
      tags: ['resume-import'],
      description:
        "Placeholder endpoint. Returns 503 until the LinkedIn v2 API client lands. Frontend should treat this as 'em breve' for now.",
    },
    sdk: { exported: true },
    handler: async () => {
      throw new LinkedinImportNotImplementedException();
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/imports/json',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    body: JsonImportBodySchema,
    response: ImportResultResponseSchema,
    openapi: {
      summary: 'Import resume from JSON Resume format',
      tags: ['resume-import'],
      description: 'Creates import job and processes JSON Resume data (jsonresume.org standard)',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const dto = ctx.body as { data: JsonResumeSchema };
      validateJsonResume(dto.data);

      const importJob = await bc.createImportJob.execute({
        userId: ctx.user!.userId,
        source: 'JSON',
        rawData: dto.data,
      });

      const result = await bc.processImport.execute(importJob.id);
      return toImportResultDto({
        importId: importJob.id,
        status: result.status,
        resumeId: result.resumeId,
        errors: result.errors,
      });
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/imports/parse',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    body: JsonImportBodySchema,
    response: ParsedResumeDataResponseSchema,
    openapi: {
      summary: 'Parse JSON Resume without importing',
      tags: ['resume-import'],
      description: 'Validates and transforms JSON Resume to internal format without saving',
    },
    sdk: { exported: true },
    handler: async (ctx) => {
      const dto = ctx.body as { data: JsonResumeSchema };
      const parsed = parser.parse(dto.data);
      return toParsedResumeDataDto(parsed);
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/imports/:importId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    params: ImportIdParams,
    response: ImportJobResponseSchema,
    openapi: {
      summary: 'Get import job status',
      tags: ['resume-import'],
      description: 'Returns current status, errors, and result of import job',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { importId } = ctx.params as { importId: string };
      const importJob = await bc.getImportStatus.execute(importId);
      return toImportJobDto(importJob);
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/imports',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    response: ImportJobListResponseSchema,
    openapi: {
      summary: 'Get import history',
      tags: ['resume-import'],
      description: 'Returns all import jobs for authenticated user, ordered by creation date',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const jobs = await bc.listImportHistory.execute(ctx.user!.userId);
      return toImportJobDtoList(jobs);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/resumes/imports/:importId',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    params: ImportIdParams,
    response: ImportEmptyResponseSchema,
    openapi: {
      summary: 'Cancel import job',
      tags: ['resume-import'],
      description: 'Cancels pending or processing import. Cannot cancel completed imports.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { importId } = ctx.params as { importId: string };
      await bc.cancelImport.execute(importId);
      return null;
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/imports/:importId/retry',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    params: ImportIdParams,
    response: ImportResultResponseSchema,
    openapi: {
      summary: 'Retry failed import',
      tags: ['resume-import'],
      description: 'Retries processing of failed import job with same data',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { importId } = ctx.params as { importId: string };
      const result = await bc.retryImport.execute(importId);
      return toImportResultDto({
        importId,
        status: result.status,
        resumeId: result.resumeId,
        errors: result.errors,
      });
    },
  },
  // ─── GitHub ───────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/import/github/parse',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    body: GithubImportBodySchema,
    response: GithubParsedProfileResponseSchema,
    openapi: {
      summary:
        'Parse a GitHub profile (repos + languages) into suggested resume content. Does not write to the resume — the client previews, the user accepts.',
      tags: ['import'],
      description: 'GitHub import API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { token: string; username?: string; repoLimit?: number };
      const parsed = await bc.importGithub.execute({
        token: body.token,
        username: body.username,
        repoLimit: body.repoLimit,
      });
      return parsed;
    },
  },
  // ─── File-driven endpoints (multipart PDF + OAuth-backed GitHub) ─────
  // Live on the same bundle as the JSON routes. The bundle exposes the
  // stateful `pdfImport` / `githubImport` POJO adapters alongside the
  // pure use-cases.
  {
    method: 'POST',
    path: '/v1/resumes/imports/pdf',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    kind: 'multipart',
    statusCode: 201,
    response: PdfImportResponseSchema,
    openapi: {
      summary: 'Import resume from a PDF file',
      tags: ['resume-import'],
      description:
        'Accepts a PDF upload (multipart/form-data, field name `file`), extracts the text with pdf-parse and structures it with the LLM. Creates a Resume row and marks it as primary when the user has none.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as MultipartBody;
      const file = body.files.find((f) => f.fieldName === 'file') ?? body.files[0];
      if (!file) throw new MissingPdfUploadException();
      const result = await bc.pdfImport.import(ctx.user!.userId, {
        buffer: file.buffer,
        originalname: file.filename,
      });
      return { resumeId: result.resumeId };
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/imports/github',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    response: GithubImportResponseSchema,
    openapi: {
      summary: 'Import profile data from GitHub',
      tags: ['resume-import'],
      description:
        "Uses the user's previously-connected GitHub OAuth token to fetch top repos and derive skills + BUILD posts. Fails with 409 GITHUB_NOT_CONNECTED if the user hasn't linked GitHub yet.",
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const result = await bc.githubImport.import(ctx.user!.userId);
      return {
        primaryStack: result.primaryStack,
        buildPostsCreated: result.buildPostsCreated,
        profileUpdated: result.profileUpdated,
      };
    },
  },
];
