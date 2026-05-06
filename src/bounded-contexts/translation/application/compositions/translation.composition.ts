/**
 * Translation Composition
 * Factory function that wires use cases with their dependencies
 */

import type { LoggerPort } from '@/shared-kernel';
import { TranslationCoreService } from '../../domain/services/translation-core.service';
import { TranslationUseCases } from '../ports/translation-use-cases.port';
import { CheckTranslationHealthUseCase } from '../use-cases/check-translation-health/check-translation-health.use-case';
import { TranslateBatchUseCase } from '../use-cases/translate-batch/translate-batch.use-case';
import { TranslateResumeUseCase } from '../use-cases/translate-resume/translate-resume.use-case';
import { TranslateTextUseCase } from '../use-cases/translate-text/translate-text.use-case';

export { TranslationUseCases };

/**
 * P1-065 — composition now requires a `LoggerPort` instead of building
 * an inline `console.*` shim. The shim broke Q22 (no inline console
 * calls in BC code) and produced unstructured output that pino's
 * production renderer ignored. Caller (the Elysia bootstrap) supplies
 * the canonical logger.
 */
export async function buildTranslationUseCases(
  logger: LoggerPort,
  libreTranslateUrl?: string,
): Promise<TranslationUseCases> {
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
