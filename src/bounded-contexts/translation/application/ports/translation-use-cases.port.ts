/**
 * Translation Use Cases Port
 * Defines the contract for translation use cases
 */

import type {
  BatchTranslationResult,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';

export const TRANSLATION_USE_CASES = Symbol('TRANSLATION_USE_CASES');

export interface TranslationUseCases {
  translateTextUseCase: {
    execute: (
      text: string,
      sourceLanguage: TranslationLanguage,
      targetLanguage: TranslationLanguage,
    ) => Promise<TranslationResult>;
  };
  translateBatchUseCase: {
    execute: (
      texts: string[],
      sourceLanguage: TranslationLanguage,
      targetLanguage: TranslationLanguage,
    ) => Promise<BatchTranslationResult>;
  };
  translateResumeUseCase: {
    execute: (
      resumeData: Record<string, unknown>,
      direction: 'pt-to-en' | 'en-to-pt',
    ) => Promise<Record<string, unknown>>;
  };
  checkTranslationHealthUseCase: {
    execute: () => Promise<boolean>;
  };
}
