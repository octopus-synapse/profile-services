/**
 * Translation Port
 * Defines the contract for translation operations
 */

import type {
  BatchTranslationResult,
  TranslationLanguage,
  TranslationResult,
} from '../types/translation.types';

export interface TranslationPort {
  translate(
    text: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult>;

  translateBatch(
    texts: string[],
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult>;

  checkServiceHealth(): Promise<boolean>;
  isAvailable(): boolean;
}

export const TRANSLATION_PORT = Symbol('TranslationPort');
