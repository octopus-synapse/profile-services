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

import { z } from 'zod';
import type { MultipartBody } from '@/infrastructure/elysia-adapter/multipart-bridge';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ImportUseCases } from './application/ports/import.port';
import {
  JsonResumeBasicsMissingException,
  JsonResumeNameMissingException,
  LinkedinImportNotImplementedException,
  MissingPdfUploadException,
} from './domain/exceptions/import.exceptions';
import { JsonResumeParser } from './domain/services/json-resume-parser';
import type { JsonResumeSchema } from './domain/types/import.types';
import {
  toImportJobDto,
  toImportJobDtoList,
  toImportResultDto,
  toParsedResumeDataDto,
} from './infrastructure/mappers/import.mapper';

const ImportIdParams = z.object({ importId: z.string() });
const JsonImportBodySchema = z.object({
  // `data` must be present — without it the handler immediately
  // throws a 500 inside `validateJsonResume(undefined)`. Forcing
  // an object here keeps the failure mode at the schema layer
  // (400 Bad Request).
  data: z.object({}).passthrough(),
});

const GithubImportBodySchema = z.object({
  token: z.string(),
  username: z.string().optional(),
  repoLimit: z.number().optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
const ImportSourceEnumSchema = z.enum(['LINKEDIN', 'PDF', 'DOCX', 'JSON', 'GITHUB']);

const ImportStatusEnumSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'MAPPING',
  'VALIDATING',
  'IMPORTING',
  'COMPLETED',
  'FAILED',
  'PARTIAL',
]);

// Bounded JSON-leaf type used by the free-form `data` blob and the
// per-section `items[]` payload. No `z.lazy()` so the OpenAPI
// generator can serialize the whole tree, but deep enough to
// represent typical JSON Resume / parsed-section payloads.
const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const JsonValueDepth1Schema = z.union([JsonLeafSchema, z.array(JsonLeafSchema)]);
const JsonValueDepth2Schema = z.union([
  JsonValueDepth1Schema,
  z.record(z.string(), JsonValueDepth1Schema),
  z.array(z.union([JsonLeafSchema, z.record(z.string(), JsonValueDepth1Schema)])),
]);
const JsonValueSchema = z.union([
  JsonValueDepth2Schema,
  z.record(z.string(), JsonValueDepth2Schema),
  z.array(JsonValueDepth2Schema),
]);

const ParsedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

const ParsedSectionItemSchema = z.record(z.string(), JsonValueSchema);

const ParsedSectionResponseSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(ParsedSectionItemSchema),
});

const ParsedResumeDataResponseSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionResponseSchema),
});

const ImportJobResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: ImportSourceEnumSchema,
  status: ImportStatusEnumSchema,
  data: z.record(z.string(), JsonValueSchema).optional(),
  parsedData: ParsedResumeDataResponseSchema.optional(),
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const ImportJobListResponseSchema = z.array(ImportJobResponseSchema);

const ImportResultResponseSchema = z.object({
  importId: z.string(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

const ImportEmptyResponseSchema = z.null();

// GitHub-import responses (parse-from-token + connected-OAuth import).
const GithubProjectBulletSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  languages: z.array(z.string()),
  bullet: z.string(),
});

const GithubParsedProfileResponseSchema = z.object({
  suggestedHeadline: z.string().nullable(),
  suggestedSummary: z.string().nullable(),
  primaryStack: z.array(z.string()),
  projectBullets: z.array(GithubProjectBulletSchema),
  stats: z.object({
    totalRepos: z.number().int(),
    nonForkRepos: z.number().int(),
    totalStars: z.number().int(),
    languagesByBytes: z.array(
      z.object({
        language: z.string(),
        bytes: z.number(),
      }),
    ),
  }),
});

const GithubImportResponseSchema = z.object({
  primaryStack: z.array(z.string()),
  buildPostsCreated: z.number().int(),
  profileUpdated: z.boolean(),
});

function validateJsonResume(data: JsonResumeSchema): void {
  if (!data.basics || typeof data.basics !== 'object') {
    throw new JsonResumeBasicsMissingException();
  }
  if (!data.basics.name || typeof data.basics.name !== 'string') {
    throw new JsonResumeNameMissingException();
  }
}

const parser = new JsonResumeParser();

export const importRoutes: ReadonlyArray<Route<ImportUseCases>> = [
  {
    method: 'POST',
    path: '/v1/resumes/imports/linkedin',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_IMPORT,
    response: ImportResultResponseSchema,
    openapi: {
      summary: 'Import profile data from LinkedIn (scaffold)',
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
    openapi: {
      summary: 'Import resume from a PDF file',
      tags: ['Resume Import'],
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
      tags: ['Resume Import'],
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
