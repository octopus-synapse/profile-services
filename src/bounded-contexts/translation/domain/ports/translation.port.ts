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

export abstract class TranslationPort {
  abstract translate(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult>;

  abstract translateBatch(
    texts: string[],
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult>;

  abstract detectLanguage?(text: string): Promise<LanguageDetectionResult[]>;

  abstract checkServiceHealth(): Promise<boolean>;
  abstract isAvailable(): boolean;
}
