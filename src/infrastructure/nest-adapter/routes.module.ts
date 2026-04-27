/**
 * Helpers for hosting framework-free `Route` descriptors inside a Nest
 * module. Use `synthesizeRouteControllers(BundleToken, routes)` from
 * inside a BC's `*.module.ts` and spread the result into
 * `controllers: [...]` — the synthesized classes inject the bundle
 * from the same module's DI scope, so no extra imports are needed.
 */

import type { Type } from '@nestjs/common';
import type { Route } from '@/shared-kernel/http/route';
import { synthesizeController } from './synthesize-controller';

export function synthesizeRouteControllers<TBundle>(
  bundleToken: abstract new (...args: never[]) => TBundle,
  routes: ReadonlyArray<Route<TBundle>>,
): Type[] {
  return routes.map((r) => synthesizeController(r, bundleToken)) as Type[];
}
