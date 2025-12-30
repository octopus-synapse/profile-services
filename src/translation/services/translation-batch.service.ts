/**
 * Batch Translation Service
 * Handles batch translation operations
 */

import { Injectable } from '@nestjs/common';
import { TranslationCoreService } from './translation-core.service';
import {
  TranslationLanguage,
  TranslationResult,
  BatchTranslationResult,
} from '../types/translation.types';

const BATCH_SIZE = 5;

@Injectable()
export class TranslationBatchService {
  constructor(private readonly coreService: TranslationCoreService) {}

  async translateBatch(
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
          this.coreService.translate(text, sourceLanguage, targetLanguage),
        ),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          translations.push(result.value);
        } else {
          failed.push({
            text: batch[index],
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    return { translations, failed };
  }
}
