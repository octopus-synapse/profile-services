/**
 * Batch Translation Service
 *
 * Delegates to `TranslationLlmPort.translateBatch` (which performs
 * one LLM call per chunk, with provider-level caching). The BC keeps a
 * thin layer that shapes the LLM result into the BC's
 * `BatchTranslationResult` DTO.
 */

import type { TranslationLlmPort } from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type {
  BatchTranslationResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';

export class TranslationBatchService {
  constructor(private readonly translationLlm: TranslationLlmPort) {}

  async translateBatch(
    texts: string[],
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    if (texts.length === 0) return { translations: [], failed: [] };

    const result = await this.translationLlm.translateBatch(texts, sourceLanguage, targetLanguage);
    const translations: TranslationResult[] = result.translations.map((t) => ({
      original: t.original,
      translated: t.translated,
      sourceLanguage,
      targetLanguage,
      detectedLanguage: t.detectedLanguage ?? undefined,
    }));
    return { translations, failed: [...result.failed] };
  }
}
