/**
 * Translation Service
 * Handles text translation using LibreTranslate server
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { AxiosError } from 'axios';

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

@Injectable()
export class TranslationService implements OnModuleInit {
  private readonly logger = new Logger(TranslationService.name);
  private readonly libreTranslateUrl: string;
  private isServiceAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.libreTranslateUrl = this.configService.get<string>(
      'LIBRETRANSLATE_URL',
      'http://localhost:5000',
    );
  }

  async onModuleInit() {
    await this.checkServiceHealth();
  }

  /**
   * Check if LibreTranslate service is available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.libreTranslateUrl}/languages`).pipe(
          timeout(5000),
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );
      this.isServiceAvailable = response.status === 200;
      this.logger.log(
        `LibreTranslate service is ${this.isServiceAvailable ? 'available' : 'unavailable'}`,
      );
      return this.isServiceAvailable;
    } catch (error) {
      this.isServiceAvailable = false;
      this.logger.warn(
        'LibreTranslate service is not available. Translation features will be disabled.',
      );
      return false;
    }
  }

  /**
   * Translate text from Portuguese to English
   */
  async translatePtToEn(text: string): Promise<TranslationResult> {
    return this.translate(text, 'pt', 'en');
  }

  /**
   * Translate text from English to Portuguese
   */
  async translateEnToPt(text: string): Promise<TranslationResult> {
    return this.translate(text, 'en', 'pt');
  }

  /**
   * Translate text between languages
   */
  async translate(
    text: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    if (!this.isServiceAvailable) {
      // Fallback: return original text if service is unavailable
      this.logger.warn(
        'Translation service unavailable, returning original text',
      );
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.libreTranslateUrl}/translate`, {
            q: text,
            source: sourceLanguage,
            target: targetLanguage,
            format: 'text',
          })
          .pipe(
            timeout(15000),
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
      );

      const translatedText = response.data?.translatedText || text;

      return {
        original: text,
        translated: translatedText,
        sourceLanguage,
        targetLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Fallback to original text
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    const translations: TranslationResult[] = [];
    const failed: Array<{ text: string; error: string }> = [];

    // Process in parallel with a concurrency limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((text) =>
          this.translate(text, sourceLanguage, targetLanguage),
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

  /**
   * Translate a resume object from PT to EN
   */
  async translateResumeToEnglish(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.translateResumeFields(resumeData, 'pt', 'en');
  }

  /**
   * Translate a resume object from EN to PT
   */
  async translateResumeToPortuguese(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.translateResumeFields(resumeData, 'en', 'pt');
  }

  /**
   * Translate specific resume fields
   */
  private async translateResumeFields(
    data: Record<string, unknown>,
    source: TranslationLanguage,
    target: TranslationLanguage,
  ): Promise<Record<string, unknown>> {
    const translatableFields = [
      'summary',
      'headline',
      'title',
      'description',
      'responsibilities',
      'achievements',
      'skills',
      'interests',
    ];

    const result = { ...data };

    for (const field of translatableFields) {
      if (typeof result[field] === 'string' && result[field]) {
        const translation = await this.translate(
          result[field] as string,
          source,
          target,
        );
        result[field] = translation.translated;
      } else if (Array.isArray(result[field])) {
        const arrayField = result[field] as unknown[];
        result[field] = await Promise.all(
          arrayField.map(async (item) => {
            if (typeof item === 'string') {
              const translation = await this.translate(item, source, target);
              return translation.translated;
            }
            if (typeof item === 'object' && item !== null) {
              return this.translateResumeFields(
                item as Record<string, unknown>,
                source,
                target,
              );
            }
            return item;
          }),
        );
      } else if (typeof result[field] === 'object' && result[field] !== null) {
        result[field] = await this.translateResumeFields(
          result[field] as Record<string, unknown>,
          source,
          target,
        );
      }
    }

    return result;
  }

  /**
   * Check if translation service is available
   */
  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
