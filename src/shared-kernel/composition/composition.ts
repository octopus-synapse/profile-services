/**
 * Canonical return shape for every BC's `build<Xxx>Composition(deps)` —
 * what the migration plan calls out as the Phase-1 contract:
 *
 *   {
 *     useCases,         // bundle of pure use-cases
 *     routes,           // Route<TBundle>[] descriptors
 *     lifecycles,       // init()/dispose() hooks the bootstrap drains
 *     eventHandlers,    // POJO subscriptions registered via EventBusPort.on()
 *     workers,          // POJO BullMQ processors registered via JobQueuePort
 *   }
 *
 * Bootstrap concatenates each BC's `routes`, runs `lifecycles.init()`
 * in order, and registers `eventHandlers` + `workers` against the
 * shared `EventBusPort`/`JobQueuePort`. Phase 0 already wired the
 * lifecycle/SIGTERM mechanics; this is the explicit type.
 *
 * Per-BC compositions returning a partial subset (e.g. badges has no
 * workers/cron yet) just omit those keys — every field is optional
 * except `useCases` and `routes`.
 */

import type { Route } from '@/shared-kernel/http/route';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';

export interface BcEventBinding<TEvent = unknown> {
  /** `EventClass.TYPE` string — the convention every domain event follows. */
  readonly eventType: string;
  readonly handler: (event: TEvent) => void | Promise<void>;
}

export interface BcWorkerBinding<TData = unknown> {
  readonly queue: string;
  readonly process: (job: { data: TData; id?: string }) => Promise<void>;
}

export interface BoundedContextComposition<TBundle = unknown> {
  readonly useCases: TBundle;
  readonly routes: ReadonlyArray<Route<TBundle>>;
  readonly lifecycles?: ReadonlyArray<Lifecycle>;
  readonly eventHandlers?: ReadonlyArray<BcEventBinding>;
  readonly workers?: ReadonlyArray<BcWorkerBinding>;
}
