/**
 * Route descriptors for the mec-sync BC. Replaces
 * `MecCourseController`, `MecInstitutionController`,
 * `MecMetadataController`, and `MecSyncInternalController`. The
 * internal/admin endpoints are gated by `InternalAuthGuard`, registered
 * via the synthesizer guard registry under id `internal-auth`.
 *
 * BUG-035 (legacy NaN handling for the institution-search `?limit=`)
 * is intentionally fixed by the migration to parsePositiveIntParam: a
 * non-numeric value now falls back to APP_CONFIG.DEFAULT_PAGE_SIZE
 * instead of producing NaN downstream.
 */

import { z } from 'zod';
import { APP_CONFIG } from '@/shared-kernel';
import { parsePositiveIntParam } from '@/shared-kernel/http/query-parsers';
import type { Route } from '@/shared-kernel/http/route.types';
import { MecSyncUseCases } from './application/ports/mec-sync.port';
import {
  AreasResponseSchema,
  CourseCodeParams,
  CourseResponseSchema,
  CoursesListResponseSchema,
  InstitutionCodeParams,
  InstitutionResponseSchema,
  InstitutionsListResponseSchema,
  ListInstitutionsQuery,
  parseCodeOrThrow,
  parseLimitOrThrow,
  SearchQuery,
  StatesResponseSchema,
  StatsResponseSchema,
  SyncHistoryResponseSchema,
  SyncStatusResponseSchema,
  SyncTriggerResponseSchema,
} from './mec-sync.routes.schemas';

export const mecSyncRoutes: ReadonlyArray<Route<MecSyncUseCases>> = [
  // ──────────────────────────────────────── Courses
  {
    method: 'GET',
    path: '/v1/mec/courses/search',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    query: SearchQuery,
    response: CoursesListResponseSchema,
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
      return { courses };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/courses/:codigoCurso',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    params: CourseCodeParams,
    response: CourseResponseSchema,
    openapi: {
      summary: 'Get course by MEC code',
      tags: ['mec-courses'],
      description: 'Course returned by MEC code',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoCurso } = ctx.params as { codigoCurso: string };
      const course = await bc.getCourseByCode.execute(parseCodeOrThrow(codigoCurso));
      return { course };
    },
  },

  // ──────────────────────────────────────── Institutions
  {
    method: 'GET',
    path: '/v1/mec/institutions',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    query: ListInstitutionsQuery,
    response: InstitutionsListResponseSchema,
    openapi: {
      summary: 'List institutions',
      tags: ['mec-institutions'],
      description: 'Institutions returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { uf } = ctx.query as { uf?: string };
      const institutions = await bc.listInstitutions.execute(uf);
      return { institutions };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/search',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    query: SearchQuery,
    response: InstitutionsListResponseSchema,
    openapi: {
      summary: 'Search institutions',
      tags: ['mec-institutions'],
      description: 'Institution search results returned',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { q, limit } = ctx.query as { q: string; limit?: string };
      const parsedLimit = parsePositiveIntParam(limit, APP_CONFIG.DEFAULT_PAGE_SIZE);
      const institutions = await bc.searchInstitutions.execute(q, parsedLimit);
      return { institutions };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/:codigoIes',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    params: InstitutionCodeParams,
    response: InstitutionResponseSchema,
    openapi: {
      summary: 'Get institution by MEC code',
      tags: ['mec-institutions'],
      description: 'Institution returned by MEC code',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoIes } = ctx.params as { codigoIes: string };
      const institution = await bc.getInstitutionByCode.execute(parseCodeOrThrow(codigoIes));
      return { institution };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/institutions/:codigoIes/courses',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    params: InstitutionCodeParams,
    response: CoursesListResponseSchema,
    openapi: {
      summary: 'Get courses by institution',
      tags: ['mec-institutions'],
      description: 'Courses returned for institution',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { codigoIes } = ctx.params as { codigoIes: string };
      const courses = await bc.listCoursesByInstitution.execute(parseCodeOrThrow(codigoIes));
      return { courses };
    },
  },

  // ──────────────────────────────────────── Metadata
  {
    method: 'GET',
    path: '/v1/mec/ufs',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    response: StatesResponseSchema,
    openapi: {
      summary: 'List all states (UFs)',
      tags: ['mec-metadata'],
      description: 'State codes returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const states = await bc.listStateCodes.execute();
      return { states };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/areas',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    response: AreasResponseSchema,
    openapi: {
      summary: 'List knowledge areas',
      tags: ['mec-metadata'],
      description: 'Knowledge areas returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const areas = await bc.listKnowledgeAreas.execute();
      return { areas };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/stats',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=600' },
    response: StatsResponseSchema,
    openapi: {
      summary: 'Get MEC statistics',
      tags: ['mec-metadata'],
      description: 'MEC statistics returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const stats = await bc.getMecStatistics.execute();
      return { stats };
    },
  },

  // ──────────────────────────────────────── Internal / admin
  // Protected by `InternalAuthGuard` (X-Internal-Token header), wired
  // through the synthesizer guard registry under id `internal-auth`.
  {
    method: 'POST',
    path: '/v1/mec/internal/sync',
    auth: { kind: 'public' },
    guards: [{ id: 'internal-auth' }],
    statusCode: 200,
    response: SyncTriggerResponseSchema,
    openapi: {
      summary: 'Trigger MEC data synchronization',
      tags: ['mec-internal'],
      description: 'Mec Internal API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const result = await bc.triggerMecSync.execute('api');
      return {
        institutionsInserted: result.institutionsInserted,
        coursesInserted: result.coursesInserted,
        totalRowsProcessed: result.totalRowsProcessed,
        errorsCount: result.errors.length,
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/internal/sync/status',
    auth: { kind: 'public' },
    guards: [{ id: 'internal-auth' }],
    headers: { 'Cache-Control': 'no-store' },
    response: SyncStatusResponseSchema,
    openapi: {
      summary: 'Get sync status',
      tags: ['mec-internal'],
      description: 'Mec Internal API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const status = await bc.getSyncStatus.execute();
      return {
        isRunning: status.isRunning,
        metadata: status.metadata,
        lastSync: status.lastSync,
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/mec/internal/sync/history',
    auth: { kind: 'public' },
    guards: [{ id: 'internal-auth' }],
    headers: { 'Cache-Control': 'no-store' },
    query: z.object({ limit: z.string().optional() }),
    response: SyncHistoryResponseSchema,
    openapi: {
      summary: 'Get sync history',
      tags: ['mec-internal'],
      description: 'Mec Internal API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { limit } = ctx.query as { limit?: string };
      const parsedLimit = limit ? parseInt(limit, 10) : APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT;
      const history = await bc.getSyncHistory.execute(parsedLimit);
      return { history };
    },
  },
];
