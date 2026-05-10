/**
 * Route descriptors for the tech-skills BC. Replaces the five legacy
 * controllers (`TechAreaController`, `TechNicheController`,
 * `TechSkillController`, `TechSkillsQueryController`,
 * `TechSkillsSyncController`).
 *
 * Two bundle tokens drive the routes:
 *  - `TechSkillsQueryService` for the read-only query endpoints.
 *  - `TechSkillsSyncService` for the admin-only sync endpoint.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const SearchQuery = z
  .object({
    q: z.string(),
    limit: z.coerce.number().int().min(1).optional(),
  })
  .openapi({ example: { q: 'react' } });

export const TypeParams = z.object({ type: z.string() });
export const AreaParams = z.object({ areaType: z.string() });
export const NicheParams = z.object({ nicheSlug: z.string() });

// ─── Response schemas (DTO mirrors) ────────────────────────────────────
export const TechAreaTypeEnum = z.enum([
  'DEVELOPMENT',
  'DEVOPS',
  'DATA',
  'SECURITY',
  'DESIGN',
  'PRODUCT',
  'QA',
  'INFRASTRUCTURE',
  'OTHER',
]);

export const SkillTypeEnum = z.enum([
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'TOOL',
  'PLATFORM',
  'METHODOLOGY',
  'SOFT_SKILL',
  'CERTIFICATION',
  'OTHER',
]);

export const TechAreaDtoSchema = z.object({
  id: z.string(),
  type: TechAreaTypeEnum,
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
});

export const TechNicheDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  areaType: TechAreaTypeEnum,
});

export const NicheReferenceSchema = z.object({
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
});

export const TechSkillDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  type: SkillTypeEnum,
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  aliases: z.array(z.string()),
  popularity: z.number().int(),
  niche: NicheReferenceSchema.nullable(),
});

export const ProgrammingLanguageDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  aliases: z.array(z.string()),
  fileExtensions: z.array(z.string()),
  paradigms: z.array(z.string()),
  typing: z.string().nullable(),
  popularity: z.number().int(),
});

export const AreasResponseSchema = z.object({ areas: z.array(TechAreaDtoSchema) });
export const NichesResponseSchema = z.object({ niches: z.array(TechNicheDtoSchema) });
export const SkillsResponseSchema = z.object({ skills: z.array(TechSkillDtoSchema) });
export const LanguagesResponseSchema = z.object({
  languages: z.array(ProgrammingLanguageDtoSchema),
});
export const CombinedSearchResponseSchema = z.object({
  results: z.object({
    languages: z.array(ProgrammingLanguageDtoSchema),
    skills: z.array(TechSkillDtoSchema),
  }),
});

export const TechSkillsSyncResultSchema = z.object({
  languagesInserted: z.number().int(),
  languagesUpdated: z.number().int(),
  skillsInserted: z.number().int(),
  skillsUpdated: z.number().int(),
  areasCreated: z.number().int(),
  nichesCreated: z.number().int(),
  errors: z.array(z.string()),
});

export const SyncResponseSchema = z.object({
  message: z.string(),
  result: TechSkillsSyncResultSchema,
});

// ──────────────────────────── Tech Skills Query routes
