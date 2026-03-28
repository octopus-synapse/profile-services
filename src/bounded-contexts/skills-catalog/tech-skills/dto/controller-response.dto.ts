/**
 * Tech Skills Controller Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Primitive Schemas
// ============================================================================

const NicheReferenceSchema = z.object({
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
});

const TechSkillSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  type: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  aliases: z.array(z.string()),
  popularity: z.number().int(),
  niche: NicheReferenceSchema.nullable(),
});

const TechNicheSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  areaType: z.string(),
});

const TechAreaSchema = z.object({
  id: z.string(),
  type: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
});

const ProgrammingLanguageSchema = z.object({
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

// ============================================================================
// Response Data Schemas
// ============================================================================

const TechSkillListDataSchema = z.object({
  skills: z.array(TechSkillSchema),
});

const TechNicheListDataSchema = z.object({
  niches: z.array(TechNicheSchema),
});

const TechAreaListDataSchema = z.object({
  areas: z.array(TechAreaSchema),
});

const ProgrammingLanguageListDataSchema = z.object({
  languages: z.array(ProgrammingLanguageSchema),
});

const TechSearchResultsDataSchema = z.object({
  results: z.object({
    languages: z.array(ProgrammingLanguageSchema),
    skills: z.array(TechSkillSchema),
  }),
});

// ============================================================================
// DTOs
// ============================================================================

export class TechSkillDataDto extends createZodDto(TechSkillSchema) {}
export class TechSkillListDataDto extends createZodDto(TechSkillListDataSchema) {}
export class TechNicheDataDto extends createZodDto(TechNicheSchema) {}
export class TechNicheListDataDto extends createZodDto(TechNicheListDataSchema) {}
export class TechAreaDataDto extends createZodDto(TechAreaSchema) {}
export class TechAreaListDataDto extends createZodDto(TechAreaListDataSchema) {}
export class ProgrammingLanguageDataDto extends createZodDto(ProgrammingLanguageSchema) {}
export class ProgrammingLanguageListDataDto extends createZodDto(
  ProgrammingLanguageListDataSchema,
) {}
export class TechSearchResultsDataDto extends createZodDto(TechSearchResultsDataSchema) {}
