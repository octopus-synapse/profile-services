/**
 * Health BC composition. Bundles the liveness/readiness probes and the
 * route descriptors that expose them. Probes are passed in as POJOs so
 * the bootstrap controls which backends are checked (Prisma, Redis,
 * BullMQ, etc.).
 */

import type { PrismaClient } from '@prisma/client';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { HealthUseCases } from './application/health.bundle';
import type { Probe, ProbeResult } from './domain/probe.port';
import { healthRoutes } from './health.routes';

export { HealthUseCases };

export interface HealthCompositionDeps {
  readonly prisma: PrismaClient;
  readonly cache?: CachePort;
  readonly version: string;
  readonly startedAt: Date;
  /** Optional extra probes the bootstrap can append (queue depth, etc.). */
  readonly extraProbes?: ReadonlyArray<Probe>;
}

function timed<T>(name: string, fn: () => Promise<T>): Probe {
  return async (): Promise<ProbeResult> => {
    const start = Date.now();
    try {
      await fn();
      return { name, status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        name,
        status: 'down',
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

export function buildHealthComposition(
  deps: HealthCompositionDeps,
): BoundedContextComposition<HealthUseCases> {
  const probes: Probe[] = [
    timed('prisma', async () => {
      await deps.prisma.$queryRaw`SELECT 1`;
    }),
  ];
  if (deps.cache) {
    const cache = deps.cache;
    probes.push(
      timed('cache', async () => {
        if (!cache.isEnabled) return;
        await cache.set('health:ping', '1', 5);
        await cache.get('health:ping');
      }),
    );
  }
  if (deps.extraProbes) probes.push(...deps.extraProbes);

  const useCases: HealthUseCases = {
    probes,
    version: deps.version,
    startedAt: deps.startedAt,
  };

  return {
    useCases,
    routes: healthRoutes,
  };
}
