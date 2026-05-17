/**
 * Aggregated HTTP-facing bundle for the onboarding BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The onboarding HTTP surface needs the use-case
 * bundles plus a handful of platform services (cache lock, SSE stream)
 * that the legacy `OnboardingController` previously injected
 * directly. We aggregate them here so the route handlers stay pure
 * functions of `(ctx, bundle)`.
 *
 * The wiring lives in `onboarding.module.ts` (`useFactory`).
 */

import type { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import type { OnboardingUseCases } from '../../domain/ports/onboarding.port';
import type { OnboardingConfigPort } from '../../domain/ports/onboarding-config.port';
import type { OnboardingProgressUseCases } from '../../domain/ports/onboarding-progress.port';
import type { SectionTypeDefinitionPort } from '../../domain/ports/section-type-definition.port';
import type { SystemThemesPort } from '../../domain/ports/system-themes.port';
import type { AdminOnboardingService } from '../../infrastructure/services/admin-onboarding.service';
import type { ActivateOnboardingExtrasUseCase } from '../use-cases/activate-onboarding-extras/activate-onboarding-extras.use-case';

export abstract class OnboardingHttpBundle {
  abstract readonly useCases: OnboardingUseCases;
  abstract readonly progress: OnboardingProgressUseCases;
  abstract readonly systemThemes: SystemThemesPort;
  abstract readonly config: OnboardingConfigPort;
  abstract readonly sectionTypes: SectionTypeDefinitionPort;
  abstract readonly cacheLock: CacheLockService;
  abstract readonly sseStream: SseStreamPort;
  abstract readonly admin: AdminOnboardingService;
  abstract readonly activateExtras: ActivateOnboardingExtrasUseCase;
}
