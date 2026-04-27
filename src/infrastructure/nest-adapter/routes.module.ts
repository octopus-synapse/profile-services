/**
 * Helpers for hosting framework-free `Route` descriptors inside a Nest
 * module. Use `synthesizeRouteControllers(BundleToken, routes)` from
 * inside a BC's `*.module.ts` and spread the result into
 * `controllers: [...]` — the synthesized classes inject the bundle
 * from the same module's DI scope, so no extra imports are needed.
 *
 * BCs that need custom guards (rate-limit, internal-auth, fit-profile,
 * etc.) pass a third argument — the guard registry — that maps each
 * `Route.guards[i].id` to the Nest guard class + optional metadata
 * key. See `synthesize-controller.ts` for the registry shape.
 */

import type { Type } from '@nestjs/common';
import type { Route } from '@/shared-kernel/http/route';
import { type GuardRegistry, synthesizeController } from './synthesize-controller';

export function synthesizeRouteControllers<TBundle>(
  bundleToken: abstract new (...args: never[]) => TBundle,
  routes: ReadonlyArray<Route<TBundle>>,
  opts: { guards?: GuardRegistry } = {},
): Type[] {
  const registry = opts.guards ?? {};
  return routes.map((r) => synthesizeController(r, bundleToken, registry)) as Type[];
}
