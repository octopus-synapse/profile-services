/**
 * Route descriptors for the social BC's connection recommendations
 * surface. Replaces `ConnectionRecsController`.
 */

import { z } from 'zod';
import type { ConnectionRecsService } from './services/connection-recs.service';

export abstract class ConnectionRecsRoutesBundle {
  abstract readonly service: ConnectionRecsService;
}

export const LimitQuery = z.object({ limit: z.string().optional() });

export const ConnectionRecommendationSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  sharedSkills: z.array(z.string()),
  overlapScore: z.number(),
});

export const ConnectionRecommendationsResponseSchema = z.object({
  recommendations: z.array(ConnectionRecommendationSchema),
});
