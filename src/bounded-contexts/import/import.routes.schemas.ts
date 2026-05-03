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
import {
  JsonResumeBasicsMissingException,
  JsonResumeNameMissingException,
} from './domain/exceptions/import.exceptions';
import { JsonResumeParser } from './domain/services/json-resume.parser';
import type { JsonResumeSchema } from './domain/types/import.types';

export const ImportIdParams = z.object({ importId: z.string() });
export const JsonImportBodySchema = z.object({
  // `data` must be present — without it the handler immediately
  // throws a 500 inside `validateJsonResume(undefined)`. Forcing
  // an object here keeps the failure mode at the schema layer
  // (400 Bad Request).
  data: z.object({}).passthrough(),
});

export const GithubImportBodySchema = z.object({
  token: z.string(),
  username: z.string().optional(),
  repoLimit: z.number().optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
export const ImportSourceEnumSchema = z.enum(['LINKEDIN', 'PDF', 'DOCX', 'JSON', 'GITHUB']);

export const ImportStatusEnumSchema = z.enum([
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
export const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const JsonValueDepth1Schema = z.union([JsonLeafSchema, z.array(JsonLeafSchema)]);
export const JsonValueDepth2Schema = z.union([
  JsonValueDepth1Schema,
  z.record(z.string(), JsonValueDepth1Schema),
  z.array(z.union([JsonLeafSchema, z.record(z.string(), JsonValueDepth1Schema)])),
]);
export const JsonValueSchema = z.union([
  JsonValueDepth2Schema,
  z.record(z.string(), JsonValueDepth2Schema),
  z.array(JsonValueDepth2Schema),
]);

export const ParsedPersonalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

export const ParsedSectionItemSchema = z.record(z.string(), JsonValueSchema);

export const ParsedSectionResponseSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(ParsedSectionItemSchema),
});

export const ParsedResumeDataResponseSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionResponseSchema),
});

export const ImportJobResponseSchema = z.object({
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

export const ImportJobListResponseSchema = z.array(ImportJobResponseSchema);

export const ImportResultResponseSchema = z.object({
  importId: z.string(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export const ImportEmptyResponseSchema = z.null();

export const PdfImportResponseSchema = z.object({
  resumeId: z.string(),
});

// GitHub-import responses (parse-from-token + connected-OAuth import).
export const GithubProjectBulletSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  languages: z.array(z.string()),
  bullet: z.string(),
});

export const GithubParsedProfileResponseSchema = z.object({
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

export const GithubImportResponseSchema = z.object({
  primaryStack: z.array(z.string()),
  buildPostsCreated: z.number().int(),
  profileUpdated: z.boolean(),
});

export function validateJsonResume(data: JsonResumeSchema): void {
  if (!data.basics || typeof data.basics !== 'object') {
    throw new JsonResumeBasicsMissingException();
  }
  if (!data.basics.name || typeof data.basics.name !== 'string') {
    throw new JsonResumeNameMissingException();
  }
}

export const parser = new JsonResumeParser();
