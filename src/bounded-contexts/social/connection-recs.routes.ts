/**
 * Route descriptors for the social BC's connection recommendations
 * surface. Replaces `ConnectionRecsController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  ConnectionRecommendationsResponseSchema,
  ConnectionRecsRoutesBundle,
  LimitQuery,
} from './connection-recs.routes.schemas';

export type { ConnectionRecsRoutesBundle } from './connection-recs.routes.schemas';

export const connectionRecsRoutes: ReadonlyArray<Route<ConnectionRecsRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/users/me/connection-recommendations',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    query: LimitQuery,
    response: ConnectionRecommendationsResponseSchema,
    openapi: {
      summary: 'Users sharing the most skills with you',
      tags: ['social'],
      description: 'Connection recommendations API',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const q = ctx.query as z.infer<typeof LimitQuery>;
      const recs = await bundle.service.getRecommendationsFor(ctx.user!.userId, {
        limit: q.limit,
      });
      return { recommendations: recs };
    },
  },
];
