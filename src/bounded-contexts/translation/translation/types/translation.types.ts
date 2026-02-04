/**
 * Translation Types
 */

export type TranslationLanguage = 'pt' | 'en';

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
  failed: Array<{ text: string; error: string }>;
}
