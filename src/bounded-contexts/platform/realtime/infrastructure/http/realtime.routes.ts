/**
 * Single SSE route for the realtime BC. `/v1/stream` replaces the 14
 * scattered SSE endpoints: clients pass `?topics=user:UID,...` and
 * receive `EffectBatch` JSON payloads — the frontend dispatcher then
 * maps each `Effect` to a side-effect (invalidate query, toast, …).
 *
 * `responseWrapper` is skipped because SSE responses are streamed,
 * not enveloped. The route is excluded from the SDK on purpose: the
 * web client subscribes through `EventSource`, not Orval.
 */
import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { SseHubPort } from '../../application/ports/sse-hub.port';
import { parseTopics } from '../../domain/topic';

/**
 * Bundle for the realtime SSE route. Holds the hub the route handler
 * subscribes against (wired in `realtime.composition.ts`).
 */
export abstract class RealtimeBundle {
  abstract readonly hub: SseHubPort;
}

const StreamQuery = z.object({ topics: z.string() });

export const realtimeRoutes: ReadonlyArray<Route<RealtimeBundle>> = [
  {
    method: 'GET',
    path: '/v1/stream',
    auth: { kind: 'jwt' },
    kind: 'sse',
    query: StreamQuery,
    skip: ['responseWrapper'],
    openapi: {
      summary: 'Unified Server-Sent Events stream',
      tags: ['realtime'],
      description:
        'Single SSE channel. Subscribe with `?topics=user:UID,notifications:UID,...`. Server emits `EffectBatch` JSON payloads — the frontend dispatcher maps each `Effect` to a side-effect (invalidate query, toast, navigate, …).',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const topics = parseTopics((ctx.query as { topics: string }).topics);
      return bundle.hub.subscribe(userId, topics);
    },
  },
];
