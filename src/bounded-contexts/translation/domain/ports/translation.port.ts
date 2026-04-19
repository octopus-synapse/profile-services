/**
 * Translation Port
 * Defines the contract for translation operations
 */

import type {
  BatchTranslationResult,
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../types/translation.types';

export interface TranslationPort {
  translate(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult>;

  translateBatch(
    texts: string[],
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult>;

  detectLanguage?(text: string): Promise<LanguageDetectionResult[]>;

  checkServiceHealth(): Promise<boolean>;
  isAvailable(): boolean;
}

export const TRANSLATION_PORT = Symbol('TranslationPort');
