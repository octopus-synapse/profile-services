/**
 * Translation Types
 */

export type TranslationLanguage = 'pt' | 'en';
export type SourceLanguage = TranslationLanguage | 'auto';

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: TranslationLanguage;
  detectedLanguage?: TranslationLanguage;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
  failed: Array<{ text: string; error: string }>;
}
