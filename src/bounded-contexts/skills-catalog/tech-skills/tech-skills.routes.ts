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

import { z } from 'zod';
import { Permission } from '@/shared-kernel';
import type { Route } from '@/shared-kernel/http/route.types';
import type { SkillType, TechAreaType } from './interfaces';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';

const SearchQuery = z.object({
  q: z.string(),
  limit: z.string().optional(),
});

const TypeParams = z.object({ type: z.string() });
const AreaParams = z.object({ areaType: z.string() });
const NicheParams = z.object({ nicheSlug: z.string() });

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  return parseInt(raw, 10);
}

// ─── Response schemas (DTO mirrors) ────────────────────────────────────
const TechAreaTypeEnum = z.enum([
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

const SkillTypeEnum = z.enum([
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

const TechAreaDtoSchema = z.object({
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

const TechNicheDtoSchema = z.object({
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

const NicheReferenceSchema = z.object({
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
});

const TechSkillDtoSchema = z.object({
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

const ProgrammingLanguageDtoSchema = z.object({
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

const AreasResponseSchema = z.object({ areas: z.array(TechAreaDtoSchema) });
const NichesResponseSchema = z.object({ niches: z.array(TechNicheDtoSchema) });
const SkillsResponseSchema = z.object({ skills: z.array(TechSkillDtoSchema) });
const LanguagesResponseSchema = z.object({ languages: z.array(ProgrammingLanguageDtoSchema) });
const CombinedSearchResponseSchema = z.object({
  results: z.object({
    languages: z.array(ProgrammingLanguageDtoSchema),
    skills: z.array(TechSkillDtoSchema),
  }),
});

const TechSkillsSyncResultSchema = z.object({
  languagesInserted: z.number().int(),
  languagesUpdated: z.number().int(),
  skillsInserted: z.number().int(),
  skillsUpdated: z.number().int(),
  areasCreated: z.number().int(),
  nichesCreated: z.number().int(),
  errors: z.array(z.string()),
});

const SyncResponseSchema = z.object({
  message: z.string(),
  result: TechSkillsSyncResultSchema,
});

// ──────────────────────────── Tech Skills Query routes
export const techSkillsQueryRoutes: ReadonlyArray<Route<TechSkillsQueryService>> = [
  // tech-areas
  {
    method: 'GET',
    path: '/v1/tech-areas',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: AreasResponseSchema,
    openapi: {
      summary: 'Get all tech areas',
      tags: ['tech-areas'],
      description: 'List of tech areas',
    },
    sdk: { exported: true },
    handler: async (_ctx, q) => {
      const areas = await q.getAllAreas();
      return { areas };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-areas/:areaType/niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: AreaParams,
    response: NichesResponseSchema,
    openapi: {
      summary: 'Get niches by area type',
      tags: ['tech-areas'],
      description: 'List of niches for the area',
    },
    sdk: { exported: true },
    handler: async (ctx, q) => {
      const { areaType } = ctx.params as { areaType: string };
      const niches = await q.getNichesByArea(areaType as TechAreaType);
      return { niches };
    },
  },

  // tech-niches
  {
    method: 'GET',
    path: '/v1/tech-niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: NichesResponseSchema,
    openapi: {
      summary: 'Get all tech niches',
      tags: ['tech-niches'],
      description: 'List of tech niches',
    },
    sdk: { exported: true },
    handler: async (_ctx, q) => {
      const niches = await q.getAllNiches();
      return { niches };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-niches/:nicheSlug/skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: NicheParams,
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get skills by niche slug',
      tags: ['tech-niches'],
      description: 'List of skills for the niche',
    },
    sdk: { exported: true },
    handler: async (ctx, q) => {
      const { nicheSlug } = ctx.params as { nicheSlug: string };
      const skills = await q.getSkillsByNiche(nicheSlug);
      return { skills };
    },
  },

  // tech-skills (the simpler controller)
  {
    method: 'GET',
    path: '/v1/tech-skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get all tech skills',
      tags: ['tech-skills'],
      description: 'List of tech skills',
    },
    sdk: { exported: true },
    handler: async (_ctx, q) => {
      const skills = await q.getAllSkills();
      return { skills };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/type/:type',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: TypeParams,
    query: z.object({ limit: z.string().optional() }),
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get skills by type',
      tags: ['tech-skills'],
      description: 'List of skills by type',
    },
    sdk: { exported: true },
    handler: async (ctx, q) => {
      const { type } = ctx.params as { type: string };
      const { limit } = ctx.query as { limit?: string };
      const skills = await q.getSkillsByType(type as SkillType, parseLimit(limit, 50));
      return { skills };
    },
  },

  // tech-skills-query (legacy nested routes)
  {
    method: 'GET',
    path: '/v1/tech-skills/areas',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: AreasResponseSchema,
    openapi: {
      summary: 'Get all tech areas',
      tags: ['tech-skills-query'],
      description: 'Tech areas returned',
    },
    handler: async (_ctx, q) => {
      const areas = await q.getAllAreas();
      return { areas };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: NichesResponseSchema,
    openapi: {
      summary: 'Get all tech niches',
      tags: ['tech-skills-query'],
      description: 'Tech niches returned',
    },
    handler: async (_ctx, q) => {
      const niches = await q.getAllNiches();
      return { niches };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/areas/:areaType/niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: AreaParams,
    response: NichesResponseSchema,
    openapi: {
      summary: 'Get niches by tech area type',
      tags: ['tech-skills-query'],
      description: 'Niches by area returned',
    },
    handler: async (ctx, q) => {
      const { areaType } = ctx.params as { areaType: string };
      const niches = await q.getNichesByArea(areaType as TechAreaType);
      return { niches };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: LanguagesResponseSchema,
    openapi: {
      summary: 'Get all programming languages',
      tags: ['tech-skills-query'],
      description: 'Programming languages returned',
    },
    handler: async (_ctx, q) => {
      const languages = await q.getAllLanguages();
      return { languages };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/languages/search',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    query: SearchQuery,
    response: LanguagesResponseSchema,
    openapi: {
      summary: 'Search programming languages',
      tags: ['tech-skills-query'],
      description: 'Programming language search results returned',
    },
    handler: async (ctx, q) => {
      const { q: query, limit } = ctx.query as { q: string; limit?: string };
      const languages = await q.searchLanguages(query, parseLimit(limit, 20));
      return { languages };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get all tech skills',
      tags: ['tech-skills-query'],
      description: 'Tech skills returned',
    },
    handler: async (_ctx, q) => {
      const skills = await q.getAllSkills();
      return { skills };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/skills/search',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    query: SearchQuery,
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Search tech skills',
      tags: ['tech-skills-query'],
      description: 'Tech skill search results returned',
    },
    handler: async (ctx, q) => {
      const { q: query, limit } = ctx.query as { q: string; limit?: string };
      const skills = await q.searchSkills(query, parseLimit(limit, 20));
      return { skills };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/niches/:nicheSlug/skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: NicheParams,
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get skills by niche',
      tags: ['tech-skills-query'],
      description: 'Skills by niche returned',
    },
    handler: async (ctx, q) => {
      const { nicheSlug } = ctx.params as { nicheSlug: string };
      const skills = await q.getSkillsByNiche(nicheSlug);
      return { skills };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/skills/type/:type',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: TypeParams,
    query: z.object({ limit: z.string().optional() }),
    response: SkillsResponseSchema,
    openapi: {
      summary: 'Get skills by type',
      tags: ['tech-skills-query'],
      description: 'Skills by type returned',
    },
    handler: async (ctx, q) => {
      const { type } = ctx.params as { type: string };
      const { limit } = ctx.query as { limit?: string };
      const skills = await q.getSkillsByType(type as SkillType, parseLimit(limit, 50));
      return { skills };
    },
  },
  {
    method: 'GET',
    path: '/v1/tech-skills/search',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    query: SearchQuery,
    response: CombinedSearchResponseSchema,
    openapi: {
      summary: 'Search languages and skills',
      tags: ['tech-skills-query'],
      description: 'Combined search results returned',
    },
    handler: async (ctx, q) => {
      const { q: query, limit } = ctx.query as { q: string; limit?: string };
      const results = await q.searchAll(query, parseLimit(limit, 20));
      return { results };
    },
  },
];

// ──────────────────────────── Tech Skills Sync routes
export const techSkillsSyncRoutes: ReadonlyArray<Route<TechSkillsSyncService>> = [
  {
    method: 'POST',
    path: '/v1/tech-skills/sync',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    response: SyncResponseSchema,
    openapi: {
      summary: 'Trigger tech skills synchronization',
      tags: ['tech-skills-sync'],
      description: 'Tech skills sync execution result',
    },
    handler: async (_ctx, sync) => {
      const result = await sync.runSync();
      return { message: 'Tech skills sync completed', result };
    },
  },
];
