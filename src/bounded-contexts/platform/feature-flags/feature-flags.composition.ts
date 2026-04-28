/**
 * Pure-TS wiring for the feature-flags BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: returns
 * `{ useCases, routes, lifecycles, sseBundle, sseRoutes }` as a
 * `BoundedContextComposition` plus the SSE extras (the
 * `featureFlagsSseRoutes` group is mounted with a different bundle
 * type — `FeatureFlagsSseBundle` — so the bootstrap mounts it as a
 * second group, exactly like notifications).
 *
 * Lifecycles (single init): bootstrap-flags validates the registry
 * and reconciles DB rows; cache + sse + flag-state init run their
 * pub/sub subscriptions.
 */

import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { FeatureFlagsUseCases } from './application/ports/feature-flags.port';
import { FeatureFlagService } from './application/services/feature-flag.service';
import { FlagStateService } from './application/services/flag-state.service';
import { BootstrapFlagsUseCase } from './application/use-cases/bootstrap-flags.use-case';
import { BroadcastRefreshUseCase } from './application/use-cases/broadcast-refresh.use-case';
import { EvaluateFlagsUseCase } from './application/use-cases/evaluate-flags.use-case';
import { ImpactAnalysisUseCase } from './application/use-cases/impact-analysis.use-case';
import { ListFlagsUseCase } from './application/use-cases/list-flags.use-case';
import { ToggleFlagUseCase } from './application/use-cases/toggle-flag.use-case';
import {
  FeatureFlagsSseBundle,
  featureFlagsRoutes,
  featureFlagsSseRoutes,
} from './feature-flags.routes';
import type { RedisFlagCache } from './infrastructure/cache/redis-flag-cache.service';
import { AuditLogFlagAuditAdapter } from './infrastructure/repositories/audit-log-flag-audit.adapter';
import { PrismaFeatureFlagRepository } from './infrastructure/repositories/prisma-feature-flag.repository';
import { PrismaRoleLookupAdapter } from './infrastructure/repositories/prisma-role-lookup.adapter';
import type { SseFlagStream } from './infrastructure/sse/sse-flag-stream.service';

export { FeatureFlagsUseCases };

/**
 * Shape of the framework-coupled deps the BC needs from the bootstrap.
 * Every entry is either a port or a Nest-registered service that the
 * Nest module already provides via `useFactory`.
 */
export interface FeatureFlagsCompositionDeps {
  readonly prisma: PrismaService;
  readonly cache: RedisFlagCache;
  readonly sse: SseFlagStream;
  readonly auditLog: AuditLogService;
  readonly eventBus: EventBusPort;
  readonly logger: LoggerPort;
}

interface InternalBundle {
  readonly useCases: FeatureFlagsUseCases;
  readonly state: FlagStateService;
  readonly bootstrap: BootstrapFlagsUseCase;
}

function buildInternal(deps: FeatureFlagsCompositionDeps): InternalBundle {
  const { prisma, cache, auditLog, eventBus, logger } = deps;

  const repo = new PrismaFeatureFlagRepository(prisma);
  const roleLookup = new PrismaRoleLookupAdapter(prisma);
  const audit = new AuditLogFlagAuditAdapter(auditLog, logger);

  const state = new FlagStateService(repo, cache);
  const evaluator = new EvaluateFlagsUseCase(state, cache, logger);
  const featureFlagService = new FeatureFlagService(evaluator, roleLookup);
  const bootstrap = new BootstrapFlagsUseCase(repo, logger);

  const useCases: FeatureFlagsUseCases = {
    listFlags: new ListFlagsUseCase(state),
    toggleFlag: new ToggleFlagUseCase(repo, cache, state, audit, eventBus, logger),
    impactAnalysis: new ImpactAnalysisUseCase(state),
    broadcastRefresh: new BroadcastRefreshUseCase(cache, state, logger),
    featureFlagService,
  };

  return { useCases, state, bootstrap };
}

export function buildFeatureFlagsUseCases(deps: FeatureFlagsCompositionDeps): FeatureFlagsUseCases {
  return buildInternal(deps).useCases;
}

export interface FeatureFlagsCompositionExtras {
  readonly sseBundle: FeatureFlagsSseBundle;
  readonly sseRoutes: typeof featureFlagsSseRoutes;
}

export function buildFeatureFlagsComposition(
  deps: FeatureFlagsCompositionDeps,
): BoundedContextComposition<FeatureFlagsUseCases> & FeatureFlagsCompositionExtras {
  const { useCases, state, bootstrap } = buildInternal(deps);
  const { cache, sse } = deps;

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        await cache.init?.();
        await sse.init?.();
        await state.init?.();
        await bootstrap.run();
      },
    },
  ];

  const sseBundle: FeatureFlagsSseBundle = { flagStream: sse };

  return {
    useCases,
    routes: featureFlagsRoutes,
    lifecycles,
    sseBundle,
    sseRoutes: featureFlagsSseRoutes,
  };
}
