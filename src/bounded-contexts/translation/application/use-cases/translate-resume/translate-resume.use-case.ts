/**
 * Translate Resume Use Case
 * Handles translation of resume objects
 */

import type { TranslationCoreService } from '../../../domain/services/translation-core.service';
import type { TranslationLanguage } from '../../../domain/types/translation.types';

const NON_TRANSLATABLE_KEYS = new Set([
  'id',
  '_id',
  'userId',
  'resumeId',
  'sectionTypeKey',
  'semanticKind',
  'slug',
  'url',
  'href',
  'email',
  'phone',
  'code',
  'locale',
  'languageCode',
  'currentStep',
]);

export class TranslateResumeUseCase {
  constructor(private readonly translationService: TranslationCoreService) {}

  async execute(
    resumeData: Record<string, unknown>,
    direction: 'pt-to-en' | 'en-to-pt',
  ): Promise<Record<string, unknown>> {
    const [source, target]: [TranslationLanguage, TranslationLanguage] =
      direction === 'pt-to-en' ? ['pt', 'en'] : ['en', 'pt'];
    return this.translateFields(resumeData, source, target);
  }

  private async translateFields(
    data: Record<string, unknown>,
    source: TranslationLanguage,
    target: TranslationLanguage,
  ): Promise<Record<string, unknown>> {
    const result = { ...data };

    for (const [field, value] of Object.entries(result)) {
      if (!this.shouldTranslateField(field, value)) {
        continue;
      }

      if (typeof value === 'string' && value) {
        const translation = await this.translationService.translate(value, source, target);
        result[field] = translation.translated;
      } else if (Array.isArray(value)) {
        result[field] = await this.translateArray(value, source, target);
      } else if (typeof value === 'object' && value !== null) {
        result[field] = await this.translateFields(
          value as Record<string, unknown>,
          source,
          target,
        );
      }
    }

    return result;
  }

  private async translateArray(
    array: unknown[],
    source: TranslationLanguage,
    target: TranslationLanguage,
  ): Promise<unknown[]> {
    return Promise.all(
      array.map(async (item) => {
        if (typeof item === 'string') {
          if (!this.shouldTranslateStringValue(item)) {
            return item;
          }

          const translation = await this.translationService.translate(item, source, target);
          return translation.translated;
        }
        if (typeof item === 'object' && item !== null) {
          return this.translateFields(item as Record<string, unknown>, source, target);
        }
        return item;
      }),
    );
  }

  private shouldTranslateField(key: string, value: unknown): boolean {
    if (NON_TRANSLATABLE_KEYS.has(key)) {
      return false;
    }

    if (typeof value === 'string') {
      return this.shouldTranslateStringValue(value);
    }

    return Array.isArray(value) || (typeof value === 'object' && value !== null);
  }

  private shouldTranslateStringValue(value: string): boolean {
    if (!value.trim()) {
      return false;
    }

    if (this.looksLikeUrl(value) || this.looksLikeEmail(value) || this.looksLikeIdentifier(value)) {
      return false;
    }

    return true;
  }

  private looksLikeUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private looksLikeIdentifier(value: string): boolean {
    const normalizedValue = value.trim();

    if (!normalizedValue || /\s/.test(normalizedValue)) {
      return false;
    }

    if (/^\d+$/.test(normalizedValue)) {
      return true;
    }

    if (/^[A-Z0-9_]+$/.test(normalizedValue) && normalizedValue.length > 1) {
      return true;
    }

    if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(normalizedValue)) {
      return true;
    }

    if (/^(?:[a-f0-9]{8,}|[a-z]+\d+[a-z\d_-]*)$/i.test(normalizedValue)) {
      return true;
    }

    return false;
  }
}
