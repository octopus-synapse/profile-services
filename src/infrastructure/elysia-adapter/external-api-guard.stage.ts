/**
 * External-API pipeline stage.
 *
 * Routes that perform real HTTP calls to non-deterministic external
 * services (GitHub API, arbitrary user-supplied URLs) declare:
 *
 *   guards: [{ id: 'external-api' }]
 *
 * The stage itself is a deliberate no-op — its only job is to mark the
 * route in swagger metadata so the contract probes
 * (`test/infrastructure/contract/probes/*.spec.ts`) can `continue` past
 * it. Probing such routes against a live backend would burn upstream
 * rate limits and produce flaky drift signal.
 *
 * Registered in `buildDefaultPipeline` so `check-route-guards` accepts
 * the id as implemented.
 */

import type { PipelineStage } from '@/shared-kernel/http/pipeline';

export function externalApiGuardStage(): PipelineStage {
  return {
    name: 'externalApiGuard',
    async run(_ctx, next) {
      await next();
    },
  };
}
