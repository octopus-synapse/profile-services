/**
 * Pure-TS wiring for the onboarding BC. Zero `@nestjs/*` imports.
 *
 * The routes consume `OnboardingHttpBundle` — an aggregate of the
 * use-case bundles plus a handful of platform services (cache lock,
 * SSE stream) the handlers need directly. This composition assembles
 * the bundle in one place; both the Nest shell and the Elysia
 * bootstrap consume it through `useFactory` / direct call.
 *
 * The preview adapter exposes a `Lifecycle.init()` that copies the
 * Typst templates to a persistent temp dir on first boot — surfaced
 * here as `lifecycles[0]` so the bootstrap drains it before serving
 * traffic.
 *
 * Cross-BC deps:
 *  - `DslUseCases` from `dsl/` (the preview adapter renders via DSL).
 *  - `TypstCompilerService` + `TypstDataSerializerService` from
 *    `export/` (Typst pipeline).
 *  - `AuditLogService` from `platform/common/audit/`.
 *  - `CacheLockService` from `platform/common/cache/`.
 *  - `SseStreamPort` from the shared kernel.
 */

import type { DslUseCases } from '@/bounded-contexts/dsl';
import type { TypstCompilerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-compiler.service';
import type { TypstDataSerializerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-data-serializer.service';
import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import { buildOnboardingUseCases } from './application/compositions/onboarding.composition';
import { buildOnboardingProgressUseCases } from './application/compositions/onboarding-progress.composition';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { OnboardingConfigAdapter } from './infrastructure/adapters/onboarding-config.adapter';
import { OnboardingPreviewAdapter } from './infrastructure/adapters/onboarding-preview.adapter';
import { SectionTypeDefinitionAdapter } from './infrastructure/adapters/persistence/section-type-definition.adapter';
import { SystemThemesAdapter } from './infrastructure/adapters/system-themes.adapter';
import { AdminOnboardingService } from './infrastructure/services/admin-onboarding.service';
import { onboardingRoutes } from './onboarding.routes';

export { OnboardingHttpBundle };

export interface OnboardingDeps {
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
  readonly auditLog: AuditLogService;
  readonly cacheLock: CacheLockService;
  readonly sseStream: SseStreamPort;
  readonly dsl: Pick<DslUseCases, 'renderResumeDsl'>;
  readonly typstSerializer: TypstDataSerializerService;
  readonly typstCompiler: TypstCompilerService;
}

export interface OnboardingBundle {
  readonly httpBundle: OnboardingHttpBundle;
  readonly previewAdapter: OnboardingPreviewAdapter;
}

export function buildOnboardingBundle(deps: OnboardingDeps): OnboardingBundle {
  const { prisma, logger, auditLog, cacheLock, sseStream, dsl, typstSerializer, typstCompiler } =
    deps;

  const useCases = buildOnboardingUseCases(prisma, logger, auditLog);
  const progress = buildOnboardingProgressUseCases(prisma, logger);
  const systemThemes = new SystemThemesAdapter(prisma);
  const config = new OnboardingConfigAdapter(prisma);
  const sectionTypes = new SectionTypeDefinitionAdapter(prisma);
  const admin = new AdminOnboardingService(prisma);
  const previewAdapter = new OnboardingPreviewAdapter(
    prisma,
    dsl,
    typstSerializer,
    typstCompiler,
    logger,
  );

  const httpBundle: OnboardingHttpBundle = {
    useCases,
    progress,
    systemThemes,
    config,
    sectionTypes,
    cacheLock,
    sseStream,
    admin,
    previewRenderer: previewAdapter,
  };

  return { httpBundle, previewAdapter };
}

/**
 * Build the framework-free composition for the onboarding BC.
 *
 * The bootstrap is responsible for:
 *  - mounting `routes` against `useCases` (the `OnboardingHttpBundle`),
 *  - awaiting `lifecycles[0].init()` at boot — this primes the Typst
 *    template cache for the preview adapter.
 */
export function buildOnboardingComposition(
  deps: OnboardingDeps,
): BoundedContextComposition<OnboardingHttpBundle> {
  const bundle = buildOnboardingBundle(deps);

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        await bundle.previewAdapter.init?.();
      },
    },
  ];

  return {
    useCases: bundle.httpBundle,
    routes: onboardingRoutes,
    lifecycles,
  };
}
