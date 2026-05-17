/**
 * Multi-pod test helper — boots two `bootstrap()` instances in the
 * same process, both pointing at the same Redis. Exercises the
 * `token-valid-after` invalidation (and any other CachePort-backed
 * cross-pod gate) end-to-end without a real container orchestrator.
 *
 * Constraints:
 * - `bootstrap()` registers `process.on('uncaughtException' | …)`
 *   listeners. Wrapping the second invocation in this helper still
 *   adds them; Node de-dupes silently. The cost is "one extra handler
 *   per boot in a test process" — acceptable.
 * - The helper requires REDIS_HOST to be set (the whole point of the
 *   harness). When missing it throws so the caller can `skip` the
 *   test instead of producing a false-positive pass against an
 *   in-memory cache.
 *
 * Usage:
 *   const { instanceA, instanceB, stop } = await withRedisCache();
 *   // …
 *   await stop();
 */

import { type BootstrapHandle, bootstrap } from '@/infrastructure/elysia-adapter/elysia-bootstrap';

export interface PodInstance {
  readonly handle: BootstrapHandle;
  readonly baseUrl: string;
}

export interface MultiPodHarness {
  readonly instanceA: PodInstance;
  readonly instanceB: PodInstance;
  stop(): Promise<void>;
}

/**
 * Spin up two Elysia instances on ephemeral ports sharing the same
 * Redis (mandated by `REDIS_HOST` env var). Throws when REDIS_HOST is
 * unset so the caller can `it.skip` instead of running with a per-pod
 * in-memory cache that would give a green false-positive.
 */
export async function withRedisCache(): Promise<MultiPodHarness> {
  if (!process.env.REDIS_HOST) {
    throw new Error(
      'withRedisCache: REDIS_HOST is required so both pods share state. ' +
        'Wrap callers in `if (!process.env.REDIS_HOST) it.skip(...)`.',
    );
  }
  // Force ephemeral ports; bootstrap reads PORT from process.env on
  // boot, so swap it twice (once per instance) and restore afterwards.
  const previousPort = process.env.PORT;
  process.env.PORT = '0';
  const handleA = await bootstrap();
  const handleB = await bootstrap();
  if (previousPort !== undefined) process.env.PORT = previousPort;
  else delete process.env.PORT;

  const baseUrlOf = (h: BootstrapHandle): string => {
    const port = (h.app.server?.port as number | undefined) ?? 0;
    if (!port) throw new Error('withRedisCache: pod did not expose a listening port');
    return `http://localhost:${port}`;
  };

  return {
    instanceA: { handle: handleA, baseUrl: baseUrlOf(handleA) },
    instanceB: { handle: handleB, baseUrl: baseUrlOf(handleB) },
    async stop(): Promise<void> {
      await handleA.stop();
      await handleB.stop();
    },
  };
}
