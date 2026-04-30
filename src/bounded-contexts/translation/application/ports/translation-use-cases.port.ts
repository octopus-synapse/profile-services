/**
 * Translation Use Cases Port
 * Defines the contract for translation use cases
 */

import type {
  BatchTranslationResult,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';

export abstract class TranslationUseCases {
  abstract readonly translateTextUseCase: {
    execute: (
      text: string,
      sourceLanguage: TranslationLanguage,
      targetLanguage: TranslationLanguage,
    ) => Promise<TranslationResult>;
  };
  abstract readonly translateBatchUseCase: {
    execute: (
      texts: string[],
      sourceLanguage: TranslationLanguage,
      targetLanguage: TranslationLanguage,
    ) => Promise<BatchTranslationResult>;
  };
  abstract readonly translateResumeUseCase: {
    execute: (
      resumeData: Record<string, unknown>,
      direction: 'pt-to-en' | 'en-to-pt',
    ) => Promise<Record<string, unknown>>;
  };
  abstract readonly checkTranslationHealthUseCase: { execute: () => Promise<boolean> };
}
