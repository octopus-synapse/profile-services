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

export function buildTranslationComposition(
  translationLlm: TranslationLlmPort,
  logger: LoggerPort,
): BoundedContextComposition<TranslationService> & TranslationCompositionExtras {
  const core = new TranslationCoreService(translationLlm, logger);
  const batch = new TranslationBatchService(translationLlm);
  const resume = new ResumeTranslationService(translationLlm);
  const useCases = new TranslationService(core, batch, resume);

  return {
    useCases,
    routes: translationRoutes,
    core,
    batch,
    resume,
  };
}
