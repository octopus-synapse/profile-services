/**
 * Translate Text Use Case
 * Translates a single text between languages
 */

import {
  TranslationBackendUnavailableException,
  TranslationPayloadTooLargeException,
  UnsupportedLocalePairException,
} from '../../../domain/exceptions/translation.exceptions';
import type { TranslationCoreService } from '../../services/translation-core.service';
import type {
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../../domain/types/translation.types';

/**
 * Hard cap for a single translate call. LibreTranslate accepts large
 * payloads but the upstream cost / latency tradeoff means we reject
 * anything wildly oversized at the use-case boundary instead of forwarding
 * a multi-megabyte payload to the engine.
 */
const MAX_TRANSLATION_CHARS = 50_000;

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(['pt', 'en', 'auto']);
const SUPPORTED_TARGETS: ReadonlySet<string> = new Set(['pt', 'en']);

export class TranslateTextUseCase {
  constructor(private readonly translationService: TranslationCoreService) {}

  async execute(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    if (!SUPPORTED_LANGUAGES.has(sourceLanguage) || !SUPPORTED_TARGETS.has(targetLanguage)) {
      throw new UnsupportedLocalePairException(sourceLanguage, targetLanguage);
    }

    if (text.length > MAX_TRANSLATION_CHARS) {
      throw new TranslationPayloadTooLargeException(MAX_TRANSLATION_CHARS);
    }

    try {
      return await this.translationService.translate(text, sourceLanguage, targetLanguage);
    } catch (_err) {
      // The core service itself swallows fetch errors and degrades gracefully,
      // but if a future implementation surfaces one we wrap it as a domain
      // exception so the global filter emits 503 rather than a raw 500.
      throw new TranslationBackendUnavailableException();
    }
  }
}
