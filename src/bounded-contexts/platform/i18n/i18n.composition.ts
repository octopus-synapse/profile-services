/**
 * Pure-TS wiring for the i18n BC. Zero `@nestjs/*` imports.
 */

import type { DictionaryProjectorService } from './application/dictionary-projector.service';
import { I18nUseCases } from './application/ports/i18n.port';
import { GetDictionaryUseCase } from './application/use-cases/get-dictionary/get-dictionary.use-case';

export { I18nUseCases };

export function buildI18nUseCases(projector: DictionaryProjectorService): I18nUseCases {
  return {
    getDictionary: new GetDictionaryUseCase(projector),
  };
}
