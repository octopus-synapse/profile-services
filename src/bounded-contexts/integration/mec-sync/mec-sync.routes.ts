/**
 * Route descriptors for the mec-sync BC. Replaces
 * `MecCourseController`, `MecInstitutionController`, and
 * `MecMetadataController`. The admin/internal controller
 * (`MecSyncInternalController`) stays as legacy because it relies on
 * the custom `InternalAuthGuard`.
 *
 * BUG-035 (NaN limit handling) is preserved — the helpers below
 * mirror the original parseInt validation semantics.
 */

import { z } from 'zod';
import { MecSyncUseCases } from './application/ports/mec-sync.port';
import { APP_CONFIG, ValidationException } from '@/shared-kernel';
import type { Route } from '@/shared-kernel/http/route';

function parseLimitOrThrow(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new ValidationException('Invalid limit parameter. Must be a positive number.');
  }
  return parsed;
}

function parseLimitLoose(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  return parseInt(raw, 10);
}

function parseCodeOrThrow(raw: string): number {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new ValidationException('Invalid integer parameter.');
  }
  return parsed;
}

const SearchQuery = z.object({
  q: z.string(),
  limit: z.string().optional(),
});

const ListInstitutionsQuery = z.object({
  uf: z.string().optional(),
});

const CourseCodeParams = z.object({ codigoCurso: z.string() });
const InstitutionCodeParams = z.object({ codigoIes: z.string() });

export const mecSyncRoutes: ReadonlyArray<Route<MecSyncUseCases>> = [
  // ──────────────────────────────────────── Courses
  {
    method: 'GET',
    path: '/v1/mec/courses/search',
    auth: { kind: 'public' },
    query: SearchQuery,
    openapi: {
      summary: 'Search courses',
      tags: ['mec-courses'],
      description: 'Courses search results returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { q, limit } = ctx.query as { q: string; limit?: string };
      const parsedLimit = parseLimitOrThrow(limit, APP_CONFIG.DEFAULT_PAGE_SIZE);
      const courses = await bc.searchCourses.execute(q, parsedLimit);
      return { success: true, data: { courses } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/courses/:codigoCurso',
    auth: { kind: 'public' },
    params: CourseCodeParams,
    openapi: {
      summary: 'Get course by MEC code',
      tags: ['mec-courses'],
      description: 'Course returned by MEC code',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoCurso } = ctx.params as { codigoCurso: string };
      const course = await bc.getCourseByCode.execute(parseCodeOrThrow(codigoCurso));
      return { success: true, data: { course } };
    },
  },

  // ──────────────────────────────────────── Institutions
  {
    method: 'GET',
    path: '/v1/mec/institutions',
    auth: { kind: 'public' },
    query: ListInstitutionsQuery,
    openapi: {
      summary: 'List institutions',
      tags: ['mec-institutions'],
      description: 'Institutions returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { uf } = ctx.query as { uf?: string };
      const institutions = await bc.listInstitutions.execute(uf);
      return { success: true, data: { institutions } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/search',
    auth: { kind: 'public' },
    query: SearchQuery,
    openapi: {
      summary: 'Search institutions',
      tags: ['mec-institutions'],
      description: 'Institution search results returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { q, limit } = ctx.query as { q: string; limit?: string };
      const parsedLimit = parseLimitLoose(limit, APP_CONFIG.DEFAULT_PAGE_SIZE);
      const institutions = await bc.searchInstitutions.execute(q, parsedLimit);
      return { success: true, data: { institutions } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/:codigoIes',
    auth: { kind: 'public' },
    params: InstitutionCodeParams,
    openapi: {
      summary: 'Get institution by MEC code',
      tags: ['mec-institutions'],
      description: 'Institution returned by MEC code',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoIes } = ctx.params as { codigoIes: string };
      const institution = await bc.getInstitutionByCode.execute(parseCodeOrThrow(codigoIes));
      return { success: true, data: { institution } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/:codigoIes/courses',
    auth: { kind: 'public' },
    params: InstitutionCodeParams,
    openapi: {
      summary: 'Get courses by institution',
      tags: ['mec-institutions'],
      description: 'Courses returned for institution',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoIes } = ctx.params as { codigoIes: string };
      const courses = await bc.listCoursesByInstitution.execute(parseCodeOrThrow(codigoIes));
      return { success: true, data: { courses } };
    },
  },

  // ──────────────────────────────────────── Metadata
  {
    method: 'GET',
    path: '/v1/mec/ufs',
    auth: { kind: 'public' },
    openapi: {
      summary: 'List all states (UFs)',
      tags: ['mec-metadata'],
      description: 'State codes returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const states = await bc.listStateCodes.execute();
      return { success: true, data: { states } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/areas',
    auth: { kind: 'public' },
    openapi: {
      summary: 'List knowledge areas',
      tags: ['mec-metadata'],
      description: 'Knowledge areas returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const areas = await bc.listKnowledgeAreas.execute();
      return { success: true, data: { areas } };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/stats',
    auth: { kind: 'public' },
    openapi: {
      summary: 'Get MEC statistics',
      tags: ['mec-metadata'],
      description: 'MEC statistics returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const stats = await bc.getMecStatistics.execute();
      return { success: true, data: { stats } };
    },
  },
];
