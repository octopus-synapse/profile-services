/**
 * Pure-TS wiring for the translation BC. Zero `@nestjs/*` imports.
 *
 * The BC's HTTP boundary fronts a single `TranslationService` aggregate
 * (no separate Use-Cases port today), so the composition uses
 * `TranslationService` itself as the bundle type.
 *
 * Provider: a `TranslationLlmPort` supplied by the BC AI composition
 * (OpenAI today). The translation BC owns domain rules (locale pairs,
 * payload limits, batch chunking, resume traversal) and consumes the
 * port as a pure capability.
 */

import type { TranslationLlmPort } from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import {
  ResumeTranslationService,
  TranslationCoreService,
  TranslationService,
} from './application/services';
import { translationRoutes } from './translation.routes';

export { ResumeTranslationService, TranslationCoreService, TranslationService };

export interface TranslationCompositionExtras {
  readonly core: TranslationCoreService;
  readonly resume: ResumeTranslationService;
}

export function buildTranslationComposition(
  translationLlm: TranslationLlmPort,
  logger: LoggerPort,
): BoundedContextComposition<TranslationService> & TranslationCompositionExtras {
  const core = new TranslationCoreService(translationLlm, logger);
  const resume = new ResumeTranslationService(translationLlm);
  const useCases = new TranslationService(core, resume);

  return {
    useCases,
    routes: translationRoutes,
    core,
    resume,
  };
}
