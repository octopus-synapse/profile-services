/**
 * Health bounded context — minimal liveness/readiness/startup endpoints.
 *
 * Phase-2 cutover replaced the deleted `@nestjs/terminus`-based module
 * with a 3-route framework-free surface:
 *
 *  - `GET /api/health`       → liveness (always 200 once the process boots)
 *  - `GET /api/health/ready` → readiness (every probe must succeed)
 *  - `GET /api/health/live`  → liveness alias for k8s `livenessProbe`
 *
 * The bundle takes one async probe per backend and reports each one's
 * status in the response body. Probes time out after `PROBE_TIMEOUT_MS`
 * so a stuck backend can't block the response.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import type { HealthUseCases } from './application/health.bundle';
import type { ProbeResult } from './domain/probe.port';

const PROBE_TIMEOUT_MS = 2000;

// ─── Response schemas ────────────────────────────────────────────────
const LivenessResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptimeSeconds: z.number().int(),
});

const ProbeResultSchema = z.object({
  name: z.string(),
  status: z.enum(['ok', 'degraded', 'down']),
  latencyMs: z.number(),
  detail: z.string().optional(),
});

const ReadinessResponseSchema = z.object({
  status: z.enum(['ok', 'down']),
  version: z.string(),
  uptimeSeconds: z.number().int(),
  probes: z.array(ProbeResultSchema),
});

async function runProbe(probe: () => Promise<ProbeResult>): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const timeout = new Promise<ProbeResult>((_resolve, reject) =>
      setTimeout(() => reject(new Error('probe timeout')), PROBE_TIMEOUT_MS),
    );
    return await Promise.race([probe(), timeout]);
  } catch (err) {
    return {
      name: 'unknown',
      status: 'down',
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export const healthRoutes: ReadonlyArray<Route<HealthUseCases>> = [
  {
    method: 'GET',
    path: '/health',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit', 'requestLogging'],
    response: LivenessResponseSchema,
    openapi: {
      summary: 'Liveness probe — always 200 once the process is booted',
      tags: ['health'],
    },
    sdk: { exported: false },
    handler: async (_ctx, bc) => ({
      status: 'ok' as const,
      version: bc.version,
      uptimeSeconds: Math.floor((Date.now() - bc.startedAt.getTime()) / 1000),
    }),
  },
  {
    method: 'GET',
    path: '/health/live',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit', 'requestLogging'],
    response: LivenessResponseSchema,
    openapi: {
      summary: 'Kubernetes-style liveness alias',
      tags: ['health'],
    },
    sdk: { exported: false },
    handler: async (_ctx, bc) => ({
      status: 'ok' as const,
      version: bc.version,
      uptimeSeconds: Math.floor((Date.now() - bc.startedAt.getTime()) / 1000),
    }),
  },
  {
    method: 'GET',
    path: '/health/ready',
    auth: { kind: 'public' },
    skip: ['responseWrapper', 'authExtractor', 'rateLimit'],
    response: ReadinessResponseSchema,
    openapi: {
      summary: 'Readiness probe — every backend must answer within 2s',
      tags: ['health'],
    },
    sdk: { exported: false },
    handler: async (ctx, bc) => {
      const results = await Promise.all(bc.probes.map(runProbe));
      const failing = results.filter((r) => r.status !== 'ok');
      const overall = failing.length === 0 ? 'ok' : 'down';
      // Status code: 200 OK / 503 Service Unavailable so k8s
      // readinessProbe sees the right HTTP code.
      ctx.state.responseStatus = overall === 'ok' ? 200 : 503;
      return {
        status: overall,
        version: bc.version,
        uptimeSeconds: Math.floor((Date.now() - bc.startedAt.getTime()) / 1000),
        probes: results,
      };
    },
  },
];
