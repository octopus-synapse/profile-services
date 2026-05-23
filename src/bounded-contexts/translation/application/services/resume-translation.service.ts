/**
 * Resume Translation Service
 *
 * Translates a whole resume object in a single LLM call via
 * `TranslationLlmPort.translateObject`. The prompt enforces structural
 * preservation (same keys, same array lengths, only string leaves
 * rewritten) and the identifier-skipping rules (URLs, emails, UUIDs,
 * slugs, SCREAMING_SNAKE_CASE), so the previous recursive traversal
 * with per-leaf calls is no longer necessary.
 */

import type {
  JsonValue,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import type { TranslationLanguage } from '../../domain/types/translation.types';

export class ResumeTranslationService {
  constructor(private readonly translationLlm: TranslationLlmPort) {}

  async translateToEnglish(resumeData: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.translate(resumeData, 'pt', 'en');
  }

  async translateToPortuguese(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.translate(resumeData, 'en', 'pt');
  }

  private async translate(
    data: Record<string, unknown>,
    source: TranslationLanguage,
    target: TranslationLanguage,
  ): Promise<Record<string, unknown>> {
    const result = await this.translationLlm.translateObject(
      data as unknown as JsonValue,
      source,
      target,
    );
    return result.translated as Record<string, unknown>;
  }
}
