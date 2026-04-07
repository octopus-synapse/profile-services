/**
 * Translate Batch Use Case
 * Handles batch translation operations
 */

import type { TranslationCoreService } from '../../../domain/services/translation-core.service';
import type {
  BatchTranslationResult,
  TranslationLanguage,
  TranslationResult,
} from '../../../domain/types/translation.types';

const BATCH_SIZE = 5;

export class TranslateBatchUseCase {
  constructor(private readonly translationService: TranslationCoreService) {}

  async execute(
    texts: string[],
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    const translations: TranslationResult[] = [];
    const failed: Array<{ text: string; error: string }> = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((text) =>
          this.translationService.translate(text, sourceLanguage, targetLanguage),
        ),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          translations.push(result.value);
        } else {
          const error = result.reason as Error | undefined;
          failed.push({
            text: batch[index],
            error: error?.message ?? 'Unknown error',
          });
        }
      });
    }

    return { translations, failed };
  }
}
