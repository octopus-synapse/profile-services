/**
 * Route descriptors for the external-jobs vertical (JSearch daily
 * batch). Read-only: the route serves locally ingested rows from
 * Postgres — it never calls the upstream API, so user traffic cannot
 * spend RapidAPI quota.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import type { JobsUseCases } from './application/ports/jobs.port';
import {
  ExternalJobListQuerySchema,
  ExternalJobsListResponseSchema,
} from './external-jobs.routes.schemas';
import { toExternalJobResponseDto } from './presenters/external-job.presenter';

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
          isRemote: query.isRemote === undefined ? undefined : query.isRemote === 'true',
          employmentType: query.employmentType,
        },
        query.page,
        query.limit,
      );
      return { ...result, items: result.items.map(toExternalJobResponseDto) };
    },
  },
];
