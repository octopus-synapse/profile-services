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
import { OnboardingConfigAdapter } from './infrastructure/adapters/onboarding-config.adapter';
import { OnboardingProgressRepository } from './infrastructure/adapters/persistence/onboarding-progress.repository';
import { SectionTypeDefinitionAdapter } from './infrastructure/adapters/persistence/section-type-definition.adapter';
import { ResumeStylesQueryAdapter } from './infrastructure/adapters/resume-styles-query.adapter';
import { AdminOnboardingService } from './infrastructure/services/admin-onboarding.service';
import { onboardingRoutes } from './onboarding.routes';

export { OnboardingHttpBundle };

export interface OnboardingDeps {
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
  readonly auditLog: AuditLogService;
  readonly cacheLock: CacheLockService;
  readonly sseStream: SseStreamPort;
}

export interface OnboardingBundle {
  readonly httpBundle: OnboardingHttpBundle;
}

export function buildOnboardingBundle(deps: OnboardingDeps): OnboardingBundle {
  const { prisma, logger, auditLog, cacheLock, sseStream } = deps;

  const useCases = buildOnboardingUseCases(prisma, logger, auditLog);
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
    routes: onboardingRoutes,
    lifecycles: [],
  };
}
