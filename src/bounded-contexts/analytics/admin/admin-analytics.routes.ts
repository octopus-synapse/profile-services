/**
 * Route descriptors for the admin-analytics submodule. Replaces
 * `AdminAnalyticsController`. The bundle token is the existing
 * `GetAdminAnalyticsOverviewUseCase` since this submodule has a single
 * use case as its dependency surface.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  AdminAnalyticsOverviewResponseSchema,
  OverviewQuerySchema,
} from './admin-analytics.routes.schemas';
import { GetAdminAnalyticsOverviewUseCase } from './application/use-cases/get-admin-analytics-overview/get-admin-analytics-overview.use-case';

export const adminAnalyticsRoutes: ReadonlyArray<Route<GetAdminAnalyticsOverviewUseCase>> = [
  {
    method: 'GET',
    path: '/v1/admin/analytics/overview',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_ALL,
    query: OverviewQuerySchema,
    response: AdminAnalyticsOverviewResponseSchema,
    openapi: {
      summary: 'Get platform-wide analytics overview',
      tags: ['admin-analytics'],
      description: 'Admin Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase) => {
      const q = ctx.query as z.infer<typeof OverviewQuerySchema>;
      return useCase.execute(q.period ?? 'week');
    },
  },
];
