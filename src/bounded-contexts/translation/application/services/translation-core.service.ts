/**
 * Core Translation Service
 *
 * Thin adapter over `TranslationLlmPort` (provided by the BC AI). Owns
 * the BC's surface: shapes the LLM result into the BC's
 * `TranslationResult` / `LanguageDetectionResult` DTOs, applies
 * BC-level guards (empty text fast-path), and lets the port layer take
 * care of caching, retry, and config-based availability.
 */

import type {
  DetectLanguageResult,
  TranslateTextInput,
  TranslateTextResult,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import { LoggerPort } from '@/shared-kernel';
import { TranslationBackendUnavailableException } from '../../domain/exceptions/translation.exceptions';
import type {
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';

const CTX = 'TranslationCoreService';

export class TranslationCoreService {
  constructor(
    private readonly translationLlm: TranslationLlmPort,
    private readonly logger: LoggerPort,
  ) {}

  /** Returns provider availability synchronously (config check — no
   * round-trip to OpenAI). Async signature kept for compatibility with
   * the bootstrap which used to await a network ping. */
  async checkServiceHealth(): Promise<boolean> {
    const available = this.translationLlm.isAvailable();
    this.logger.log(
      `Translation provider is ${available ? 'configured' : 'unavailable (OPENAI_API_KEY missing)'}`,
      CTX,
    );
    return available;
  }

  async translate(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return { original: text, translated: text, sourceLanguage, targetLanguage };
    }

    try {
      const input: TranslateTextInput = { text, source: sourceLanguage, target: targetLanguage };
      const result: TranslateTextResult = await this.translationLlm.translate(input);
      return {
        original: result.original,
        translated: result.translated,
        sourceLanguage,
        targetLanguage,
        detectedLanguage: result.detectedLanguage ?? undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Translation failed: ${message}`, { context: CTX });
      throw new TranslationBackendUnavailableException(message, error);
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult[]> {
    if (!text || text.trim().length === 0) return [];
    try {
      const result: DetectLanguageResult = await this.translationLlm.detectLanguage(text);
      if (!result.language) return [];
      return [{ language: result.language, confidence: result.confidence }];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Language detection failed: ${message}`, { context: CTX });
      return [];
    }
  }

  isAvailable(): boolean {
    return this.translationLlm.isAvailable();
  }
}
