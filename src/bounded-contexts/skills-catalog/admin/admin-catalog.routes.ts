/**
 * Route descriptors for the skills-catalog/admin BC. Replaces the five
 * legacy admin controllers (`AdminTechAreasController`,
 * `AdminTechNichesController`, `AdminTechSkillsController`,
 * `AdminSpokenLanguagesController`, `AdminProgrammingLanguagesController`).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  AnyBody,
  CodeParam,
  DeleteAckResponseSchema,
  IdParam,
  ListQuery,
  NicheListQuery,
  ProgrammingLanguageListResponseSchema,
  ProgrammingLanguageRowSchema,
  SkillListQuery,
  SlugParam,
  SpokenLanguageListResponseSchema,
  SpokenLanguageRowSchema,
  TechAreaListResponseSchema,
  TechAreaRowSchema,
  TechNicheListResponseSchema,
  TechNicheRowSchema,
  TechSkillListResponseSchema,
  TechSkillRowSchema,
  toListInput,
} from './admin-catalog.routes.schemas';
import { AdminCatalogUseCases } from './application/ports/admin-catalog.port';

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
      tags: ['admin-tech-areas'],
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
      tags: ['admin-tech-areas'],
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
      tags: ['admin-tech-areas'],
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
      tags: ['admin-tech-areas'],
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
      tags: ['admin-tech-areas'],
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
      tags: ['admin-tech-niches'],
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
      tags: ['admin-tech-niches'],
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
      tags: ['admin-tech-niches'],
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
      tags: ['admin-tech-niches'],
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
      tags: ['admin-tech-niches'],
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
      tags: ['admin-tech-skills'],
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
      tags: ['admin-tech-skills'],
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
      tags: ['admin-tech-skills'],
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
      tags: ['admin-tech-skills'],
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
      tags: ['admin-tech-skills'],
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
      tags: ['admin-spoken-languages'],
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
      tags: ['admin-spoken-languages'],
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
      tags: ['admin-spoken-languages'],
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
      tags: ['admin-spoken-languages'],
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
      tags: ['admin-spoken-languages'],
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
      tags: ['admin-programming-languages'],
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
      tags: ['admin-programming-languages'],
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
      tags: ['admin-programming-languages'],
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
      tags: ['admin-programming-languages'],
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
      tags: ['admin-programming-languages'],
      description: 'Admin Programming Languages API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteAdminProgrammingLanguage.execute((ctx.params as { slug: string }).slug);
      return {};
    },
  },
];
