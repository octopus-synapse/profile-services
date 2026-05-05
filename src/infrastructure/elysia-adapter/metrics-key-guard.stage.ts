/**
 * Metrics-key pipeline stage (P1-follow-up to NEW-1).
 *
 * Prometheus `GET /metrics` is left publicly reachable but gated by a
 * shared bearer token: `Authorization: Bearer <PROMETHEUS_KEY>` OR a
 * dedicated `X-Metrics-Key: <PROMETHEUS_KEY>` header. The bearer
 * variant is what `prometheus.yml` produces by default; the explicit
 * header variant is convenient for ad-hoc curls.
 *
 * Reuses `INTERNAL_API_TOKEN` when no `PROMETHEUS_KEY` is set, so dev
 * environments don't need a second secret. Composition root passes
 * the resolved value in.
 *
 * Empty token → fail-closed (every metrics call rejected with 401).
 */

import { timingSafeEqual } from 'node:crypto';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

export interface MetricsKeyGuardOptions {
  readonly expectedKey: string | undefined;
}

function safeEqualString(a: string, b: string): boolean {
  const target = Buffer.from(a);
  const supplied = Buffer.from(b);
  if (target.length !== supplied.length) {
    timingSafeEqual(target, Buffer.alloc(target.length));
    return false;
  }
  return timingSafeEqual(target, supplied);
}

export function metricsKeyGuardStage(opts: MetricsKeyGuardOptions): PipelineStage {
  const expected = opts.expectedKey ?? '';
  return {
    name: 'metricsKeyGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === 'metrics-key');
      if (!guard) return next();

      if (!expected) {
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          statusCode: 401,
          code: 'METRICS_KEY_DISABLED',
          message: 'Metrics endpoint disabled (PROMETHEUS_KEY not configured)',
          severity: 'modal',
          params: {},
        };
        return;
      }

      const supplied = extractMetricsKey(ctx.headers);
      const ok = supplied !== null && safeEqualString(expected, supplied);
      if (!ok) {
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          statusCode: 401,
          code: 'METRICS_KEY_REJECTED',
          message: 'Invalid metrics key',
          severity: 'modal',
          params: {},
        };
        return;
      }
      await next();
    },
  };
}

function extractMetricsKey(headers: Record<string, unknown>): string | null {
  const explicit = headers['x-metrics-key'];
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  return null;
}
