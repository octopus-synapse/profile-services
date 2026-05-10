/**
 * Config BC composition. The BC has no dependencies (no Prisma, no
 * cache, no use cases) — it just exposes server-side constants over
 * HTTP. Bundle type is `Record<string, never>` and `useCases` is `{}`.
 */

import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { type ConfigUseCases, configRoutes } from './config.routes';

export type { ConfigUseCases };

export function buildConfigComposition(): BoundedContextComposition<ConfigUseCases> {
  return {
    useCases: {},
    routes: configRoutes,
  };
}
