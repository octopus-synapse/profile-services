/**
 * Aggregated HTTP-facing bundle for the onboarding BC.
 *
 * The route synthesizer (`synthesizeRouteControllers`) injects a single
 * DI token per BC. The onboarding HTTP surface needs the use-case
 * bundles plus a handful of platform services (cache lock, event
 * emitter) that the legacy `OnboardingController` previously injected
 * directly. We aggregate them here so the route handlers stay pure
 * functions of `(ctx, bundle)`.
 *
 * The wiring lives in `onboarding.module.ts` (`useFactory`).
 */

import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import type { OnboardingUseCases } from '../../domain/ports/onboarding.port';
import type { OnboardingConfigPort } from '../../domain/ports/onboarding-config.port';
import type { OnboardingProgressUseCases } from '../../domain/ports/onboarding-progress.port';
import type { PreviewRendererPort } from '../../domain/ports/preview-renderer.port';
import type { SectionTypeDefinitionPort } from '../../domain/ports/section-type-definition.port';
import type { SystemThemesPort } from '../../domain/ports/system-themes.port';
import type { AdminOnboardingService } from '../../infrastructure/services/admin-onboarding.service';

export abstract class OnboardingHttpBundle {
  abstract readonly useCases: OnboardingUseCases;
  abstract readonly progress: OnboardingProgressUseCases;
  abstract readonly systemThemes: SystemThemesPort;
  abstract readonly config: OnboardingConfigPort;
  abstract readonly sectionTypes: SectionTypeDefinitionPort;
  abstract readonly cacheLock: CacheLockService;
  abstract readonly events: EventEmitter2;
  abstract readonly admin: AdminOnboardingService;
  abstract readonly previewRenderer: PreviewRendererPort;
}
