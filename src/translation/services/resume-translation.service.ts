/**
 * Resume Translation Service
 * Handles translation of resume objects
 */

import { Injectable } from '@nestjs/common';
import { TranslationCoreService } from './translation-core.service';
import { TranslationLanguage } from '../types/translation.types';

const TRANSLATABLE_FIELDS = [
  'summary',
  'headline',
  'title',
  'description',
  'responsibilities',
  'achievements',
  'skills',
  'interests',
];

@Injectable()
export class ResumeTranslationService {
  constructor(private readonly coreService: TranslationCoreService) {}

  async translateToEnglish(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.translateFields(resumeData, 'pt', 'en');
  }

  async translateToPortuguese(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.translateFields(resumeData, 'en', 'pt');
  }

  private async translateFields(
    data: Record<string, unknown>,
    source: TranslationLanguage,
    target: TranslationLanguage,
  ): Promise<Record<string, unknown>> {
    const result = { ...data };

    for (const field of TRANSLATABLE_FIELDS) {
      if (typeof result[field] === 'string' && result[field]) {
        const translation = await this.coreService.translate(
          result[field] as string,
          source,
          target,
        );
        result[field] = translation.translated;
      } else if (Array.isArray(result[field])) {
        result[field] = await this.translateArray(
          result[field] as unknown[],
          source,
          target,
        );
      } else if (typeof result[field] === 'object' && result[field] !== null) {
        result[field] = await this.translateFields(
          result[field] as Record<string, unknown>,
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
          const translation = await this.coreService.translate(
            item,
            source,
            target,
          );
          return translation.translated;
        }
        if (typeof item === 'object' && item !== null) {
          return this.translateFields(
            item as Record<string, unknown>,
            source,
            target,
          );
        }
        return item;
      }),
    );
  }
}
