/**
 * Route descriptors for the external-jobs vertical (JSearch daily
 * batch). The list/save routes serve and snapshot locally ingested rows
 * from Postgres — they never call the upstream API, so user traffic
 * cannot spend RapidAPI quota.
 *
 * `/v1/jobs/external/saved` is declared before the param-shaped jobs
 * routes by the composition (external routes mount first).
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import type { JobsUseCases } from './application/ports/jobs.port';
import {
  ExternalJobListQuerySchema,
  ExternalJobsListResponseSchema,
  SavedExternalJobsListResponseSchema,
  SaveExternalJobResponseSchema,
  UnsaveExternalJobResponseSchema,
} from './external-jobs.routes.schemas';
import { pageOnly, PageOnlyQuerySchema } from './jobs.routes.schemas';
import {
  toExternalJobResponseDto,
  toSavedExternalJobResponseDto,
} from './presenters/external-job.presenter';

export const externalJobsRoutes: ReadonlyArray<Route<JobsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/jobs/external',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: ExternalJobListQuerySchema,
    response: ExternalJobsListResponseSchema,
    openapi: {
      summary: 'List externally aggregated job postings (daily JSearch batch)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const query = ExternalJobListQuerySchema.parse(ctx.query);
      const result = await bc.listExternalJobs.execute(
        {
          q: query.q,
          workMode: query.workMode,
          employmentType: query.employmentType,
          postedWithin: query.postedWithin,
        },
        query.page,
        query.limit,
        ctx.user!.userId,
      );
      return { ...result, items: result.items.map(toExternalJobResponseDto) };
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/external/saved',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    response: SavedExternalJobsListResponseSchema,
    openapi: {
      summary: 'List external jobs saved by the current user',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
      const result = await bc.listSavedExternalJobs.execute(ctx.user!.userId, page, limit);
      return { ...result, items: result.items.map(toSavedExternalJobResponseDto) };
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/external/:id/save',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParamSchema,
    response: SaveExternalJobResponseSchema,
    openapi: {
      summary: 'Save an external job (snapshots the listing for the current user)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.saveExternalJob.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/jobs/external/saved/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParamSchema,
    response: UnsaveExternalJobResponseSchema,
    openapi: {
      summary: 'Remove a saved external job',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.unsaveExternalJob.execute(id, ctx.user!.userId);
    },
  },
];
