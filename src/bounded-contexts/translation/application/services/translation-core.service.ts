/**
 * Core Translation Service
 * Handles basic translation operations using LibreTranslate
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranslationLanguage, TranslationResult } from '../../domain/types/translation.types';

@Injectable()
export class TranslationCoreService implements OnModuleInit {
  private readonly logger = new Logger(TranslationCoreService.name);
  private readonly libreTranslateUrl: string;
  private isServiceAvailable = false;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('LIBRETRANSLATE_URL');
    this.libreTranslateUrl = url ?? 'http://libretranslate:5000';
    new URL(this.libreTranslateUrl);
  }

  async onModuleInit() {
    await this.checkServiceHealth();
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
      return { original: text, translated: text, sourceLanguage, targetLanguage };
    }

    if (!this.isServiceAvailable) {
      this.logger.warn('Translation service unavailable, returning original text');
      return { original: text, translated: text, sourceLanguage, targetLanguage };
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
        signal: AbortSignal.timeout(15000),
      });

      const data = (await response.json()) as { translatedText?: string };
      return {
        original: text,
        translated: data.translatedText ?? text,
        sourceLanguage,
        targetLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { original: text, translated: text, sourceLanguage, targetLanguage };
    }
  }

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
