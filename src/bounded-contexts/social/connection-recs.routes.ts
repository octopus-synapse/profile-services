/**
 * Route descriptors for the social BC's connection recommendations
 * surface. Replaces `ConnectionRecsController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { ConnectionRecsService } from './services/connection-recs.service';

export abstract class ConnectionRecsRoutesBundle {
  abstract readonly service: ConnectionRecsService;
}

const LimitQuery = z.object({ limit: z.string().optional() });

const ConnectionRecommendationSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  sharedSkills: z.array(z.string()),
  overlapScore: z.number(),
});

const ConnectionRecommendationsResponseSchema = z.object({
  recommendations: z.array(ConnectionRecommendationSchema),
});

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
      const parsed = q.limit ? Number.parseInt(q.limit, 10) : undefined;
      const recs = await bundle.service.getRecommendationsFor(ctx.user!.userId, {
        limit: Number.isFinite(parsed) ? parsed : undefined,
      });
      return { recommendations: recs };
    },
  },
];
