/**
 * Route descriptors for the skills-catalog/admin BC. Replaces the five
 * legacy admin controllers (`AdminTechAreasController`,
 * `AdminTechNichesController`, `AdminTechSkillsController`,
 * `AdminSpokenLanguagesController`, `AdminProgrammingLanguagesController`).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { AdminCatalogUseCases } from './application/ports/admin-catalog.port';

const ListQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  isActive: z.string().optional(),
});

const NicheListQuery = ListQuery.extend({ areaId: z.string().optional() });

const SkillListQuery = ListQuery.extend({
  nicheId: z.string().optional(),
  type: z.string().optional(),
});

const IdParam = z.object({ id: z.string() });
const CodeParam = z.object({ code: z.string() });
const SlugParam = z.object({ slug: z.string() });

const AnyBody = z.record(z.unknown());

// ─── Response schemas (mirror Prisma row shapes) ──────────────────────
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

const TechAreaRowSchema = z.object({
  id: z.string(),
  type: TechAreaTypeEnum,
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechNicheRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  areaId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechSkillRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  type: SkillTypeEnum,
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  nicheId: z.string().nullable(),
  aliases: z.array(z.string()),
  keywords: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SpokenLanguageRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProgrammingLanguageRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  paradigms: z.array(z.string()),
  typing: z.string().nullable(),
  aliases: z.array(z.string()),
  fileExtensions: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TechAreaListResponseSchema = PaginatedResponseSchema(TechAreaRowSchema);
const TechNicheListResponseSchema = PaginatedResponseSchema(TechNicheRowSchema);
const TechSkillListResponseSchema = PaginatedResponseSchema(TechSkillRowSchema);
const SpokenLanguageListResponseSchema = PaginatedResponseSchema(SpokenLanguageRowSchema);
const ProgrammingLanguageListResponseSchema = PaginatedResponseSchema(ProgrammingLanguageRowSchema);

const DeleteAckResponseSchema = z.object({}).strict();

type ListInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};

function toListInput(q: z.infer<typeof ListQuery>): ListInput {
  return {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    search: q.search,
    isActive: q.isActive !== undefined ? String(q.isActive) === 'true' : undefined,
  };
}

export const adminCatalogRoutes: ReadonlyArray<Route<AdminCatalogUseCases>> = [
  // ─── Tech Areas ───────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/tech-areas',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: ListQuery,
    response: TechAreaListResponseSchema,
    openapi: {
      summary: 'List all tech areas',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.listAdminTechAreas.execute(toListInput(ctx.query as z.infer<typeof ListQuery>)),
  },
  {
    method: 'GET',
    path: '/v1/admin/tech-areas/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: TechAreaRowSchema,
    openapi: {
      summary: 'Get tech area by ID',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => bc.getAdminTechArea.execute((ctx.params as { id: string }).id),
  },
  {
    method: 'POST',
    path: '/v1/admin/tech-areas',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    body: AnyBody,
    response: TechAreaRowSchema,
    openapi: {
      summary: 'Create tech area',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => bc.createAdminTechArea.execute(ctx.body as Record<string, unknown>),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/tech-areas/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    body: AnyBody,
    response: TechAreaRowSchema,
    openapi: {
      summary: 'Update tech area',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateAdminTechArea.execute(
        (ctx.params as { id: string }).id,
        ctx.body as Record<string, unknown>,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/tech-areas/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: DeleteAckResponseSchema,
    openapi: {
      summary: 'Delete tech area',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechArea.execute((ctx.params as { id: string }).id);
      return {};
    },
  },

  // ─── Tech Niches ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/tech-niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: NicheListQuery,
    response: TechNicheListResponseSchema,
    openapi: {
      summary: 'List all tech niches',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof NicheListQuery>;
      return bc.listAdminTechNiches.execute({ ...toListInput(q), areaId: q.areaId });
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/tech-niches/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: TechNicheRowSchema,
    openapi: {
      summary: 'Get tech niche by ID',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => bc.getAdminTechNiche.execute((ctx.params as { id: string }).id),
  },
  {
    method: 'POST',
    path: '/v1/admin/tech-niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    body: AnyBody,
    response: TechNicheRowSchema,
    openapi: {
      summary: 'Create tech niche',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.createAdminTechNiche.execute(ctx.body as Record<string, unknown>),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/tech-niches/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    body: AnyBody,
    response: TechNicheRowSchema,
    openapi: {
      summary: 'Update tech niche',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateAdminTechNiche.execute(
        (ctx.params as { id: string }).id,
        ctx.body as Record<string, unknown>,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/tech-niches/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: DeleteAckResponseSchema,
    openapi: {
      summary: 'Delete tech niche',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechNiche.execute((ctx.params as { id: string }).id);
      return {};
    },
  },

  // ─── Tech Skills ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/tech-skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: SkillListQuery,
    response: TechSkillListResponseSchema,
    openapi: {
      summary: 'List all tech skills',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof SkillListQuery>;
      return bc.listAdminTechSkills.execute({
        ...toListInput(q),
        nicheId: q.nicheId,
        type: q.type,
      });
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/tech-skills/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: TechSkillRowSchema,
    openapi: {
      summary: 'Get tech skill by ID',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => bc.getAdminTechSkill.execute((ctx.params as { id: string }).id),
  },
  {
    method: 'POST',
    path: '/v1/admin/tech-skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    body: AnyBody,
    response: TechSkillRowSchema,
    openapi: {
      summary: 'Create tech skill',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.createAdminTechSkill.execute(ctx.body as Record<string, unknown>),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/tech-skills/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    body: AnyBody,
    response: TechSkillRowSchema,
    openapi: {
      summary: 'Update tech skill',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateAdminTechSkill.execute(
        (ctx.params as { id: string }).id,
        ctx.body as Record<string, unknown>,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/tech-skills/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: IdParam,
    response: DeleteAckResponseSchema,
    openapi: {
      summary: 'Delete tech skill',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechSkill.execute((ctx.params as { id: string }).id);
      return {};
    },
  },

  // ─── Spoken Languages ─────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/spoken-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: ListQuery,
    response: SpokenLanguageListResponseSchema,
    openapi: {
      summary: 'List all spoken languages',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.listAdminSpokenLanguages.execute(toListInput(ctx.query as z.infer<typeof ListQuery>)),
  },
  {
    method: 'GET',
    path: '/v1/admin/spoken-languages/:code',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: CodeParam,
    response: SpokenLanguageRowSchema,
    openapi: {
      summary: 'Get spoken language by code',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.getAdminSpokenLanguage.execute((ctx.params as { code: string }).code),
  },
  {
    method: 'POST',
    path: '/v1/admin/spoken-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    body: AnyBody,
    response: SpokenLanguageRowSchema,
    openapi: {
      summary: 'Create spoken language',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.createAdminSpokenLanguage.execute(ctx.body as Record<string, unknown>),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/spoken-languages/:code',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: CodeParam,
    body: AnyBody,
    response: SpokenLanguageRowSchema,
    openapi: {
      summary: 'Update spoken language',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateAdminSpokenLanguage.execute(
        (ctx.params as { code: string }).code,
        ctx.body as Record<string, unknown>,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/spoken-languages/:code',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: CodeParam,
    response: DeleteAckResponseSchema,
    openapi: {
      summary: 'Delete spoken language',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminSpokenLanguage.execute((ctx.params as { code: string }).code);
      return {};
    },
  },

  // ─── Programming Languages ────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/programming-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: ListQuery,
    response: ProgrammingLanguageListResponseSchema,
    openapi: {
      summary: 'List all programming languages',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.listAdminProgrammingLanguages.execute(toListInput(ctx.query as z.infer<typeof ListQuery>)),
  },
  {
    method: 'GET',
    path: '/v1/admin/programming-languages/:slug',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: SlugParam,
    response: ProgrammingLanguageRowSchema,
    openapi: {
      summary: 'Get programming language by slug',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.getAdminProgrammingLanguage.execute((ctx.params as { slug: string }).slug),
  },
  {
    method: 'POST',
    path: '/v1/admin/programming-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    body: AnyBody,
    response: ProgrammingLanguageRowSchema,
    openapi: {
      summary: 'Create programming language',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.createAdminProgrammingLanguage.execute(ctx.body as Record<string, unknown>),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/programming-languages/:slug',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: SlugParam,
    body: AnyBody,
    response: ProgrammingLanguageRowSchema,
    openapi: {
      summary: 'Update programming language',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateAdminProgrammingLanguage.execute(
        (ctx.params as { slug: string }).slug,
        ctx.body as Record<string, unknown>,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/programming-languages/:slug',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    params: SlugParam,
    response: DeleteAckResponseSchema,
    openapi: {
      summary: 'Delete programming language',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminProgrammingLanguage.execute((ctx.params as { slug: string }).slug);
      return {};
    },
  },
];
