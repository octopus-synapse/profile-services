/**
 * Translation Composition
 * Factory function that wires use cases with their dependencies
 */

import type { LoggerPort } from '@/shared-kernel';
import { TranslationUseCases } from '../ports/translation-use-cases.port';
import { TranslationCoreService } from '../services/translation-core.service';
import { CheckTranslationHealthUseCase } from '../use-cases/check-translation-health/check-translation-health.use-case';
import { TranslateBatchUseCase } from '../use-cases/translate-batch/translate-batch.use-case';
import { TranslateResumeUseCase } from '../use-cases/translate-resume/translate-resume.use-case';
import { TranslateTextUseCase } from '../use-cases/translate-text/translate-text.use-case';

const DEFAULT_LIBRETRANSLATE_URL = 'http://libretranslate:5000';

export { TranslationUseCases };

/**
 * P1-065 — composition now requires a `LoggerPort` instead of building
 * an inline `console.*` shim. The shim broke Q22 (no inline console
 * calls in BC code) and produced unstructured output that pino's
 * production renderer ignored. Caller (the Elysia bootstrap) supplies
 * the canonical logger.
 *
 * P2-103 — `TranslationCoreService` was duplicated under `domain/services`
 * AND `application/services`. The domain copy has been removed (a domain
 * service has no business doing HTTP); this composition wires the
 * framework-free application copy.
 */
export async function buildTranslationUseCases(
  logger: LoggerPort,
  libreTranslateUrl?: string,
): Promise<TranslationUseCases> {
  const coreService = new TranslationCoreService(
    libreTranslateUrl ?? DEFAULT_LIBRETRANSLATE_URL,
    logger,
  );

  // Initialize service health check (replaces OnModuleInit)
  await coreService.checkServiceHealth();

  return {
    translateTextUseCase: new TranslateTextUseCase(coreService),
    translateBatchUseCase: new TranslateBatchUseCase(coreService),
    translateResumeUseCase: new TranslateResumeUseCase(coreService),
    checkTranslationHealthUseCase: new CheckTranslationHealthUseCase(coreService),
  };
}
