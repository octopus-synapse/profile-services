/**
 * Pure-TS wiring for the i18n BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: returns `{ useCases, routes, translation }`
 * — `translation` is the load-bearing extra, since the bootstrap's
 * `errorMapperStage` consumes a `TranslationPort` impl. Keeping it on
 * the composition (rather than building it through a separate helper)
 * means callers wire i18n exactly once and the bootstrap can read
 * `i18n.translation` to feed the pipeline. Cleaner than a parallel
 * `buildI18nTranslation(...)` helper because the dictionary projector
 * and the translator share zero state — they just both live in the
 * BC.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { DictionaryProjectorService } from './application/dictionary-projector.service';
import { I18nService } from './application/i18n.service';
import { I18nUseCases } from './application/ports/i18n.port';
import { GetDictionaryUseCase } from './application/use-cases/get-dictionary/get-dictionary.use-case';
import type { TranslationPort } from './domain/translation.port';
import { i18nRoutes } from './i18n.routes';

export { I18nUseCases };

export function buildI18nUseCases(projector: DictionaryProjectorService): I18nUseCases {
  return {
    getDictionary: new GetDictionaryUseCase(projector),
  };
}

/**
 * Builds the framework-free `TranslationPort` impl. Exported so the
 * bootstrap can pass it to the pipeline's `errorMapperStage` without
 * having to introspect the full composition return.
 */
export function buildI18nTranslation(logger: LoggerPort): TranslationPort {
  return new I18nService(logger);
}

export interface I18nCompositionExtras {
  /** `TranslationPort` impl — fed to `errorMapperStage(deps)`. */
  readonly translation: TranslationPort;
}

export function buildI18nComposition(
  logger: LoggerPort,
): BoundedContextComposition<I18nUseCases> & I18nCompositionExtras {
  const projector = new DictionaryProjectorService();
  const useCases = buildI18nUseCases(projector);
  const translation = buildI18nTranslation(logger);

  return {
    useCases,
    routes: i18nRoutes,
    translation,
  };
}
