/**
 * Translate Text Use Case
 * Translates a single text between languages
 */

import type { TranslationCoreService } from '../../../domain/services/translation-core.service';
import type {
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../../domain/types/translation.types';

export class TranslateTextUseCase {
  constructor(private readonly translationService: TranslationCoreService) {}

  async execute(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    return this.translationService.translate(text, sourceLanguage, targetLanguage);
  }
}
