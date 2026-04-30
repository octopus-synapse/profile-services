/**
 * Bundle token for the i18n BC. Doubles as the TypeScript shape and
 * the Nest DI token. Wiring lives in `i18n.composition.ts` —
 * Nest-free.
 */

import type { GetDictionaryUseCase } from '../use-cases/get-dictionary/get-dictionary.use-case';

export abstract class I18nUseCases {
  abstract readonly getDictionary: GetDictionaryUseCase;
}
