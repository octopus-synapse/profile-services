/**
 * Pure-TS wiring for the i18n BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: returns `{ useCases, routes, translation }`
 * — `translation` is the load-bearing extra, since the bootstrap's
 * `errorMapperStage` consumes a `TranslationPort` impl. Keeping it on
 * the composition (rather than building it through a separate helper)
 * means callers wire i18n exactly once and the bootstrap can read
 * `i18n.translation` to feed the pipeline. The BC serves no routes of
 * its own since the dictionary endpoints were removed (ADR-005) — the
 * app ships the dictionaries in its generated SDK.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { I18nService } from './application/i18n.service';
import type { TranslationPort } from './domain/translation.port';

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
): BoundedContextComposition<Record<string, never>> & I18nCompositionExtras {
  return {
    useCases: {},
    routes: [],
    translation: buildI18nTranslation(logger),
  };
}
