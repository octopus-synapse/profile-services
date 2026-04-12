/**
 * Translation Composition
 * Factory function that wires use cases with their dependencies
 */

import { TranslationCoreService } from '../../domain/services/translation-core.service';
import {
  TRANSLATION_USE_CASES,
  type TranslationUseCases,
} from '../ports/translation-use-cases.port';
import { CheckTranslationHealthUseCase } from '../use-cases/check-translation-health/check-translation-health.use-case';
import { TranslateBatchUseCase } from '../use-cases/translate-batch/translate-batch.use-case';
import { TranslateResumeUseCase } from '../use-cases/translate-resume/translate-resume.use-case';
import { TranslateTextUseCase } from '../use-cases/translate-text/translate-text.use-case';

export { TRANSLATION_USE_CASES };

export async function buildTranslationUseCases(
  libreTranslateUrl?: string,
): Promise<TranslationUseCases> {
  const logger = {
    log: (msg: string) => console.log(`[Translation] ${msg}`),
    warn: (msg: string) => console.warn(`[Translation] ${msg}`),
    error: (msg: string) => console.error(`[Translation] ${msg}`),
  };
  const coreService = new TranslationCoreService(logger, libreTranslateUrl);

  // Initialize service health check (replaces OnModuleInit)
  await coreService.checkServiceHealth();

  return {
    translateTextUseCase: new TranslateTextUseCase(coreService),
    translateBatchUseCase: new TranslateBatchUseCase(coreService),
    translateResumeUseCase: new TranslateResumeUseCase(coreService),
    checkTranslationHealthUseCase: new CheckTranslationHealthUseCase(coreService),
  };
}
