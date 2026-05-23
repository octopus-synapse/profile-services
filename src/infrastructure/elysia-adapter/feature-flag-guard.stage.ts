/**
 * Feature-flag pipeline stage (NEW-1).
 *
 * Routes hidden behind an unreleased flag declare:
 *
 *   guards: [{ id: 'feature-flag', metadata: { key: 'resumes.export.pdf' } }]
 *
 * Before NEW-1 was found this guard was declared in a handful of
 * routes but the pipeline had no implementation — the metadata was
 * silently ignored and the route always ran. This stage wires the
 * declaration into a real check against `FeatureFlagService`. Failure
 * mode is `assertEnabled`'s `FeatureFlagDisabledException` (404) so a
 * disabled flag makes the route invisible (consistent with the rest
 * of the feature-flag surface).
 */

import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

export function featureFlagGuardStage(flags: FeatureFlagService): PipelineStage {
  return {
    name: 'featureFlagGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === 'feature-flag');
      if (!guard) return next();

      const meta = (guard.metadata ?? {}) as { key?: unknown };
      const key = typeof meta.key === 'string' ? meta.key : null;
      if (!key) {
        throw new Error(
          `featureFlagGuard: invalid metadata on ${route?.method} ${route?.path} — expected { key: string }`,
        );
      }
      await flags.assertEnabled(key, ctx.user?.userId ?? null);
      await next();
    },
  };
}
