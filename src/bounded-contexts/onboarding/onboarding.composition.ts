/**
 * Pure-TS wiring for the onboarding BC. Zero `@nestjs/*` imports.
 *
 * The routes consume `OnboardingHttpBundle` — an aggregate of the
 * use-case bundles plus a handful of platform services (cache lock,
 * SSE stream) the handlers need directly. This composition assembles
 * the bundle in one place; both the Nest shell and the Elysia
 * bootstrap consume it through `useFactory` / direct call.
 *
 * Cross-BC deps:
 *  - `AuditLogService` from `platform/common/audit/`.
 *  - `CacheLockService` from `platform/common/cache/`.
 *  - `SseStreamPort` from the shared kernel.
 */

import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { buildOnboardingUseCases } from './application/compositions/onboarding.composition';
import { buildOnboardingProgressUseCases } from './application/compositions/onboarding-progress.composition';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { ActivateOnboardingExtrasUseCase } from './application/use-cases/activate-onboarding-extras/activate-onboarding-extras.use-case';
import {
  RenderOnboardingPreviewUseCase,
  type RenderOnboardingResumeHtmlFn,
} from './application/use-cases/render-onboarding-preview/render-onboarding-preview.use-case';
import { OnboardingConfigAdapter } from './infrastructure/adapters/onboarding-config.adapter';
import { OnboardingProgressRepository } from './infrastructure/adapters/persistence/onboarding-progress.repository';
import { SectionTypeDefinitionAdapter } from './infrastructure/adapters/persistence/section-type-definition.adapter';
import { ResumeStylesQueryAdapter } from './infrastructure/adapters/resume-styles-query.adapter';
import { AdminOnboardingService } from './infrastructure/services/admin-onboarding.service';
import { onboardingRoutes } from './onboarding.routes';
import { onboardingAdminRoutes } from './onboarding-admin.routes';

export { OnboardingHttpBundle };

export interface OnboardingDeps {
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
  readonly auditLog: AuditLogService;
  readonly cacheLock: CacheLockService;
  readonly sseStream: SseStreamPort;
  /**
   * Validates a submitted `location` against the geo dataset (geo BC's
   * `lookup.locationExists`). Optional — when absent, location isn't
   * geo-validated (e.g. in tests).
   */
  readonly validateLocation?: (label: string) => Promise<boolean>;
  /**
   * Compiles + renders an in-memory résumé to HTML for the live
   * resume-style preview. Supplied by the composition root (wraps the
   * export BC's html generator). Optional — when absent (e.g. tests that
   * don't wire export), the preview route throws on use.
   */
  readonly renderResumeHtml?: RenderOnboardingResumeHtmlFn;
}

export interface OnboardingBundle {
  readonly httpBundle: OnboardingHttpBundle;
}

export function buildOnboardingBundle(deps: OnboardingDeps): OnboardingBundle {
  const { prisma, logger, auditLog, cacheLock, sseStream, validateLocation, renderResumeHtml } =
    deps;

  const useCases = buildOnboardingUseCases(prisma, logger, auditLog, validateLocation);
  const progress = buildOnboardingProgressUseCases(prisma, logger);
  const resumeStyles = new ResumeStylesQueryAdapter(prisma);
  const config = new OnboardingConfigAdapter(prisma);
  const sectionTypes = new SectionTypeDefinitionAdapter(prisma);
  const admin = new AdminOnboardingService(prisma);
  // Standalone use case wired directly into the HTTP bundle — keeps the
  // existing `OnboardingUseCases` abstract bundle (consumed by other
  // contexts and tests) untouched.
  const activateExtras = new ActivateOnboardingExtrasUseCase(
    new OnboardingProgressRepository(prisma, logger),
  );
  // Live résumé preview. When the render fn isn't wired (tests without the
  // export BC), fail loudly only if the route is actually exercised.
  const renderHtml: RenderOnboardingResumeHtmlFn =
    renderResumeHtml ??
    (() => {
      throw new Error('Onboarding résumé preview renderer is not configured');
    });
  const renderOnboardingPreview = new RenderOnboardingPreviewUseCase(
    progress,
    sectionTypes,
    resumeStyles,
    renderHtml,
    logger,
  );

  const httpBundle: OnboardingHttpBundle = {
    useCases,
    progress,
    resumeStyles,
    config,
    sectionTypes,
    cacheLock,
    sseStream,
    admin,
    activateExtras,
    renderOnboardingPreview,
  };

  return { httpBundle };
}

/**
 * Build the framework-free composition for the onboarding BC. The
 * bootstrap mounts `routes` against `useCases` (the
 * `OnboardingHttpBundle`).
 */
export function buildOnboardingComposition(
  deps: OnboardingDeps,
): BoundedContextComposition<OnboardingHttpBundle> {
  const bundle = buildOnboardingBundle(deps);

  return {
    useCases: bundle.httpBundle,
    routes: [...onboardingRoutes, ...onboardingAdminRoutes],
    lifecycles: [],
  };
}
