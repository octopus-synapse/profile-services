/**
 * Pure-TS wiring for the translation BC. Zero `@nestjs/*` imports — the
 * Nest module is a thin shell that exposes the result of this function
 * through `useFactory` providers.
 *
 * The BC's HTTP boundary fronts a single `TranslationService` aggregate
 * (no separate Use-Cases port today), so the composition uses
 * `TranslationService` itself as the bundle type.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import {
  ResumeTranslationService,
  TranslationBatchService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import { translationRoutes } from './translation.routes';

export {
  ResumeTranslationService,
  TranslationBatchService,
  TranslationCoreService,
  TranslationService,
};

export interface TranslationCompositionExtras {
  readonly core: TranslationCoreService;
  readonly batch: TranslationBatchService;
  readonly resume: ResumeTranslationService;
}

/**
 * Build the framework-free composition for the translation BC.
 *
 * The composition root is responsible for:
 *  - reading `LIBRETRANSLATE_URL` from config (caller passes it in),
 *  - invoking `core.checkServiceHealth()` once after construction (the
 *    Nest shell awaits it before exposing the bundle).
 */
export function buildTranslationComposition(
  libreTranslateUrl: string,
  logger: LoggerPort,
): BoundedContextComposition<TranslationService> & TranslationCompositionExtras {
  const core = new TranslationCoreService(libreTranslateUrl, logger);
  const batch = new TranslationBatchService(core);
  const resume = new ResumeTranslationService(core);
  const useCases = new TranslationService(core, batch, resume);

  return {
    useCases,
    routes: translationRoutes,
    core,
    batch,
    resume,
  };
}
