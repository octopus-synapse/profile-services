/**
 * Tech Skills Catalog DTOs
 *
 * Domain types and validation schemas for the tech skills catalog system.
 * This includes tech areas, niches, skills, and programming languages.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const TechAreaTypeEnum = z.enum([
 "DEVELOPMENT",
 "DEVOPS",
 "DATA",
 "SECURITY",
 "DESIGN",
 "PRODUCT",
 "QA",
 "INFRASTRUCTURE",
 "OTHER",
]);

export type TechAreaType = z.infer<typeof TechAreaTypeEnum>;

export const SkillTypeEnum = z.enum([
 "LANGUAGE",
 "FRAMEWORK",
 "LIBRARY",
 "DATABASE",
 "TOOL",
 "PLATFORM",
 "METHODOLOGY",
 "SOFT_SKILL",
 "CERTIFICATION",
 "OTHER",
]);

export type SkillType = z.infer<typeof SkillTypeEnum>;

// ============================================================================
// Tech Area (Categories like Development, DevOps, Data, etc.)
// ============================================================================

export const TechAreaSchema = z.object({
 id: z.string().cuid(),
 type: TechAreaTypeEnum,
 nameEn: z.string().min(1),
 namePtBr: z.string().min(1),
 descriptionEn: z.string().nullable(),
 descriptionPtBr: z.string().nullable(),
 icon: z.string().nullable(),
 color: z.string().nullable(),
 order: z.number().int().nonnegative(),
});

export type TechArea = z.infer<typeof TechAreaSchema>;

// ============================================================================
// Tech Niche (Sub-categories like Frontend, Backend, Mobile, etc.)
// ============================================================================

export const TechNicheSchema = z.object({
 id: z.string().cuid(),
 slug: z.string().min(1),
 nameEn: z.string().min(1),
 namePtBr: z.string().min(1),
 descriptionEn: z.string().nullable(),
 descriptionPtBr: z.string().nullable(),
 icon: z.string().nullable(),
 color: z.string().nullable(),
 order: z.number().int().nonnegative(),
 areaType: TechAreaTypeEnum,
});

export type TechNiche = z.infer<typeof TechNicheSchema>;

// ============================================================================
// Tech Skill (Individual skills like React, Docker, PostgreSQL, etc.)
// ============================================================================

export const TechSkillNicheSchema = z.object({
 slug: z.string(),
 nameEn: z.string(),
 namePtBr: z.string(),
});

export const TechSkillSchema = z.object({
 id: z.string().cuid(),
 slug: z.string().min(1),
 nameEn: z.string().min(1),
 namePtBr: z.string().min(1),
 type: SkillTypeEnum,
 icon: z.string().nullable(),
 color: z.string().nullable(),
 website: z.string().url().nullable(),
 aliases: z.array(z.string()),
 popularity: z.number().int().nonnegative(),
 niche: TechSkillNicheSchema.nullable(),
});

export type TechSkill = z.infer<typeof TechSkillSchema>;

// ============================================================================
// Programming Language (Special type for programming languages)
// ============================================================================

export const ProgrammingLanguageSchema = z.object({
 id: z.string().cuid(),
 slug: z.string().min(1),
 nameEn: z.string().min(1),
 namePtBr: z.string().min(1),
 color: z.string().nullable(),
 website: z.string().url().nullable(),
 aliases: z.array(z.string()),
 fileExtensions: z.array(z.string()),
 paradigms: z.array(z.string()),
 typing: z.string().nullable(),
 popularity: z.number().int().nonnegative(),
});

export type ProgrammingLanguage = z.infer<typeof ProgrammingLanguageSchema>;

// ============================================================================
// Search Results
// ============================================================================

export const TechSkillsSearchResultSchema = z.object({
 languages: z.array(ProgrammingLanguageSchema),
 skills: z.array(TechSkillSchema),
});

export type TechSkillsSearchResult = z.infer<
 typeof TechSkillsSearchResultSchema
>;

// ============================================================================
// Sync Results (for admin sync operations)
// ============================================================================

export const TechSkillsSyncResultSchema = z.object({
 languagesInserted: z.number().int().nonnegative(),
 languagesUpdated: z.number().int().nonnegative(),
 skillsInserted: z.number().int().nonnegative(),
 skillsUpdated: z.number().int().nonnegative(),
 areasCreated: z.number().int().nonnegative(),
 nichesCreated: z.number().int().nonnegative(),
 errors: z.array(z.string()),
});

export type TechSkillsSyncResult = z.infer<typeof TechSkillsSyncResultSchema>;

// ============================================================================
// Parsed Data (from external sources)
// ============================================================================

export const ParsedLanguageSchema = z.object({
 slug: z.string(),
 nameEn: z.string(),
 namePtBr: z.string(),
 color: z.string().nullable(),
 extensions: z.array(z.string()),
 aliases: z.array(z.string()),
 paradigms: z.array(z.string()),
 typing: z.string().nullable(),
 website: z.string().nullable(),
 popularity: z.number().int().nonnegative(),
});

export type ParsedLanguage = z.infer<typeof ParsedLanguageSchema>;

export const ParsedSkillSchema = z.object({
 slug: z.string(),
 nameEn: z.string(),
 namePtBr: z.string(),
 type: SkillTypeEnum,
 nicheSlug: z.string().nullable(),
 color: z.string().nullable(),
 icon: z.string().nullable(),
 website: z.string().nullable(),
 aliases: z.array(z.string()),
 keywords: z.array(z.string()),
 popularity: z.number().int().nonnegative(),
});

export type ParsedSkill = z.infer<typeof ParsedSkillSchema>;

// ============================================================================
// GitHub Linguist Types (for language parsing)
// ============================================================================

export const GithubLanguageTypeSchema = z.enum([
 "programming",
 "data",
 "markup",
 "prose",
]);

export type GithubLanguageType = z.infer<typeof GithubLanguageTypeSchema>;

export const GithubLanguageSchema = z.object({
 type: GithubLanguageTypeSchema,
 color: z.string().optional(),
 extensions: z.array(z.string()).optional(),
 filenames: z.array(z.string()).optional(),
 aliases: z.array(z.string()).optional(),
 interpreters: z.array(z.string()).optional(),
 tm_scope: z.string().optional(),
 ace_mode: z.string().optional(),
 codemirror_mode: z.string().optional(),
 codemirror_mime_type: z.string().optional(),
 language_id: z.number().int().optional(),
 group: z.string().optional(),
 wrap: z.boolean().optional(),
});

export type GithubLanguage = z.infer<typeof GithubLanguageSchema>;

export const GithubLanguagesYmlSchema = z.record(
 z.string(),
 GithubLanguageSchema,
);
export type GithubLanguagesYml = z.infer<typeof GithubLanguagesYmlSchema>;

// ============================================================================
// Stack Overflow Types (for popularity data)
// ============================================================================

export const StackOverflowTagSchema = z.object({
 name: z.string(),
 count: z.number().int().nonnegative(),
 has_synonyms: z.boolean(),
 is_moderator_only: z.boolean(),
 is_required: z.boolean(),
});

export type StackOverflowTag = z.infer<typeof StackOverflowTagSchema>;

export const StackOverflowResponseSchema = z.object({
 items: z.array(StackOverflowTagSchema),
 has_more: z.boolean(),
 quota_max: z.number().int().nonnegative(),
 quota_remaining: z.number().int().nonnegative(),
});

export type StackOverflowResponse = z.infer<typeof StackOverflowResponseSchema>;
