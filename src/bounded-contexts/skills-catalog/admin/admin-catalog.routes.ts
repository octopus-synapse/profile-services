/**
 * Route descriptors for the skills-catalog/admin BC. Replaces the five
 * legacy admin controllers (`AdminTechAreasController`,
 * `AdminTechNichesController`, `AdminTechSkillsController`,
 * `AdminSpokenLanguagesController`, `AdminProgrammingLanguagesController`).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
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
    openapi: {
      summary: 'Delete tech area',
      tags: ['Admin - Tech Areas'],
      description: 'Admin Tech Areas API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechArea.execute((ctx.params as { id: string }).id);
      return { success: true };
    },
  },

  // ─── Tech Niches ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/tech-niches',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: NicheListQuery,
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
    openapi: {
      summary: 'Delete tech niche',
      tags: ['Admin - Tech Niches'],
      description: 'Admin Tech Niches API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechNiche.execute((ctx.params as { id: string }).id);
      return { success: true };
    },
  },

  // ─── Tech Skills ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/tech-skills',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: SkillListQuery,
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
    openapi: {
      summary: 'Delete tech skill',
      tags: ['Admin - Tech Skills'],
      description: 'Admin Tech Skills API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminTechSkill.execute((ctx.params as { id: string }).id);
      return { success: true };
    },
  },

  // ─── Spoken Languages ─────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/spoken-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: ListQuery,
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
    openapi: {
      summary: 'Delete spoken language',
      tags: ['Admin - Spoken Languages'],
      description: 'Admin Spoken Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminSpokenLanguage.execute((ctx.params as { code: string }).code);
      return { success: true };
    },
  },

  // ─── Programming Languages ────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/programming-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_MANAGE,
    query: ListQuery,
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
    openapi: {
      summary: 'Delete programming language',
      tags: ['Admin - Programming Languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminProgrammingLanguage.execute((ctx.params as { slug: string }).slug);
      return { success: true };
    },
  },
];
