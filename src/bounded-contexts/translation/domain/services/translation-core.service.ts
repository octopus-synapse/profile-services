/**
 * Core Translation Service (Domain Service)
 * Handles basic translation operations using LibreTranslate
 */

import { Logger } from '@nestjs/common';
import type { TranslationLanguage, TranslationResult } from '../types/translation.types';

export class TranslationCoreService {
  private readonly logger = new Logger(TranslationCoreService.name);
  private readonly libreTranslateUrl: string;
  private readonly timeoutMs: number;
  private isServiceAvailable = false;

  constructor(libreTranslateUrl?: string) {
    this.libreTranslateUrl = libreTranslateUrl ?? 'http://libretranslate:5000';
    this.timeoutMs = 30_000;
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/languages`, {
        signal: AbortSignal.timeout(5000),
      });
      this.isServiceAvailable = response.ok;
      this.logger.log(
        `LibreTranslate service is ${this.isServiceAvailable ? 'available' : 'unavailable'}`,
      );
      return this.isServiceAvailable;
    } catch {
      this.isServiceAvailable = false;
      this.logger.warn(
        'LibreTranslate service is not available. Translation features will be disabled.',
      );
      return false;
    }
  }

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
      this.logger.warn('Translation service unavailable, returning original text');
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    try {
      const response = await fetch(`${this.libreTranslateUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const responseData = (await response.json()) as { translatedText?: string } | undefined;
      const translatedText = responseData?.translatedText ?? text;
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
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }
  }

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
