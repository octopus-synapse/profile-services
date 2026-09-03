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

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ImportSource, ImportStatus } from '@prisma/client';
import { z } from 'zod';
import { JsonResumeParser } from './domain/services/json-resume.parser';

extendZodWithOpenApi(z);

export const ImportSourceEnumSchema = z.nativeEnum(ImportSource);

export const ImportStatusEnumSchema = z.nativeEnum(ImportStatus);

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

export const ImportIdParams = z.object({ importId: z.string().uuid() });

export const ParsedResumeDataResponseSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(ParsedSectionResponseSchema),
});

export const ImportJobResponseSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  source: ImportSourceEnumSchema,
  status: ImportStatusEnumSchema,
  data: z.record(z.string(), JsonValueSchema).optional(),
  parsedData: ParsedResumeDataResponseSchema.optional(),
  resumeId: z.string().uuid().optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const ImportJobListResponseSchema = z.array(ImportJobResponseSchema);

export const ImportResultResponseSchema = z.object({
  importId: z.string().uuid(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().uuid().optional(),
  errors: z.array(z.string()).optional(),
});

export const ImportEmptyResponseSchema = z.null();

export const PdfImportResponseSchema = z.object({
  resumeId: z.string().uuid(),
});

// GitHub-import responses (parse-from-token + connected-OAuth import).
export const GithubProjectBulletSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  languages: z.array(z.string()),
  bullet: z.string(),
});

export const parser = new JsonResumeParser();
